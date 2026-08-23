import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { GameService } from './game.service';

/** This game's identifier in the shared Earnivo Central Game Reward (redemption) API. */
export const GAME_CODE = 'TIC_RUSH';
export const MIN_WITHDRAWAL_COINS = 1000;

/**
 * Host of the shared Earnivo Central backend (the same API the Main Ionic App, Agent
 * Panel and other game apps already redeem coins through via POST /api/game-rewards/redeem).
 * TODO: point this at the deployed Central API host before shipping.
 */
const CENTRAL_API_HOST = 'http://localhost:4227';

export interface WithdrawalRequest {
  gameCode: string;
  mobileNumber: string;
  coins: number;
  idempotencyKey: string;
}

/** Shape of `data` in the Central API's `{ success, data }` envelope for a completed redemption. */
export interface WithdrawalResponse {
  gameCode: string;
  gameName: string;
  coinsSubmitted: number;
  coinsRedeemed: number;
  coinsPerConversion: number;
  rupeesPerConversion: number;
  /** Rupee amount confirmed by the backend for this redemption — never computed locally. */
  amountCredited: string;
  transactionId: string;
  idempotencyKey: string;
  status: string;
  createdAt: string;
  /** The player's Earnivo wallet balance after this credit — not this game's coin balance. */
  newWalletBalance: string;
}

export type WithdrawalErrorCode =
  | 'BELOW_MINIMUM' | 'INVALID_MOBILE' | 'NO_ACCOUNT' | 'INSUFFICIENT_COINS' | 'DUPLICATE_CONVERSION'
  | 'USER_SUSPENDED' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'TIMEOUT' | 'SERVER_ERROR'
  | 'ALREADY_PROCESSING' | 'UNKNOWN';

export class WithdrawalError extends Error {
  constructor(public readonly code: WithdrawalErrorCode, message: string) {
    super(message);
  }
}

/**
 * Client for the shared Earnivo Central Game Reward API (coins → Earnivo wallet rupees).
 * The endpoint is intentionally unauthenticated for game clients (spec Phase 15A §11) —
 * it identifies the player by their registered Earnivo mobile number instead. Coin balance
 * is only ever mutated after the backend confirms success; a network failure, timeout, 5xx,
 * or any unexpected response leaves the local balance untouched.
 */
@Injectable({ providedIn: 'root' })
export class WithdrawalService {
  private pendingIdempotencyKey: string | null = null;
  private inFlight = false;

  constructor(private http: HttpClient, private game: GameService) {}

  get isEligible(): boolean { return this.game.coins >= MIN_WITHDRAWAL_COINS; }
  get isProcessing(): boolean { return this.inFlight; }

  getRegisteredMobileNumber(): string {
    return localStorage.getItem('tic-rush-withdraw-mobile-v1') || '';
  }

  private saveRegisteredMobileNumber(mobileNumber: string): void {
    localStorage.setItem('tic-rush-withdraw-mobile-v1', mobileNumber);
  }

  /** Submits a coin redemption. Reuses the same idempotency key across retries of the same logical request. */
  async redeem(mobileNumber: string, coins: number): Promise<WithdrawalResponse> {
    if (this.inFlight) {
      throw new WithdrawalError('ALREADY_PROCESSING', 'A withdrawal is already being processed.');
    }
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      throw new WithdrawalError('INVALID_MOBILE', 'Enter a valid 10-digit mobile number.');
    }
    if (coins < MIN_WITHDRAWAL_COINS) {
      throw new WithdrawalError('BELOW_MINIMUM', `Minimum withdrawal is ${MIN_WITHDRAWAL_COINS} coins.`);
    }
    if (coins > this.game.coins) {
      throw new WithdrawalError('INSUFFICIENT_COINS', 'Insufficient coin balance.');
    }

    const idempotencyKey = this.pendingIdempotencyKey ??= createIdempotencyKey();
    const body: WithdrawalRequest = { gameCode: GAME_CODE, mobileNumber, coins, idempotencyKey };

    this.inFlight = true;
    try {
      const response = await firstValueFrom(
        this.http.post<{ success: true; data: WithdrawalResponse }>(`${CENTRAL_API_HOST}/api/game-rewards/redeem`, body)
      );

      this.pendingIdempotencyKey = null;
      this.saveRegisteredMobileNumber(mobileNumber);
      this.game.deductCoins(response.data.coinsRedeemed);
      return response.data;
    } catch (err) {
      throw this.mapError(err);
    } finally {
      this.inFlight = false;
    }
  }

  private mapError(err: unknown): WithdrawalError {
    if (err instanceof HttpErrorResponse) {
      const code = (err.error?.error?.code as string | undefined)?.toUpperCase();
      const message = err.error?.error?.message as string | undefined;
      switch (code) {
        case 'DUPLICATE_CONVERSION':
          this.pendingIdempotencyKey = null;
          return new WithdrawalError('DUPLICATE_CONVERSION', 'This withdrawal was already submitted.');
        case 'INVALID_PHONE':
          return new WithdrawalError('INVALID_MOBILE', message ?? 'Enter a valid 10-digit mobile number.');
        case 'USER_SUSPENDED':
          this.pendingIdempotencyKey = null;
          return new WithdrawalError('USER_SUSPENDED', message ?? 'This account has been suspended.');
        case 'RATE_LIMITED':
          return new WithdrawalError('RATE_LIMITED', message ?? 'Too many attempts. Please try again later.');
        case 'VALIDATION_ERROR':
          this.pendingIdempotencyKey = null;
          if (message?.toLowerCase().includes('no earnivo account')) {
            return new WithdrawalError('NO_ACCOUNT', message);
          }
          if (message?.toLowerCase().includes('minimum')) {
            return new WithdrawalError('BELOW_MINIMUM', message);
          }
          return new WithdrawalError('UNKNOWN', message ?? 'This withdrawal request was rejected.');
      }
      if (err.status === 0) {
        return new WithdrawalError('NETWORK_ERROR', 'Network error — your coins are safe. Please try again.');
      }
      if (err.status === 408 || err.status === 504) {
        return new WithdrawalError('TIMEOUT', 'The request timed out — your coins are safe. Please try again.');
      }
      if (err.status >= 500) {
        return new WithdrawalError('SERVER_ERROR', 'Server error — your coins are safe. Please try again.');
      }
      this.pendingIdempotencyKey = null;
      return new WithdrawalError('UNKNOWN', 'Something went wrong. Please try again.');
    }
    return new WithdrawalError('NETWORK_ERROR', 'Network error — your coins are safe. Please try again.');
  }
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${GAME_CODE}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
