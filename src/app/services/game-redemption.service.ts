import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/** Earnivo Central Backend host. The Games API (GET /api/games) and Game Rewards API (POST /api/game-rewards/redeem) both live here. */
const API_BASE_URL = 'http://localhost:4227';

/** This game's identifier in the Central backend's game registry. Single source — do not repeat this string elsewhere. */
export const GAME_CODE = 'TIC_RUSH';

/** Used only until GET /api/games has returned this game's real minimumCoins — never the authoritative limit. */
const FALLBACK_MIN_COINS = 1000;

const LAST_MOBILE_KEY = 'tic-rush-last-payout-mobile-v1';

export interface RedemptionRequest {
  gameCode: string;
  mobileNumber: string;
  coins: number;
  idempotencyKey: string;
}

/** The `data` payload of a successful POST /api/game-rewards/redeem response. */
export interface RedemptionResult {
  gameCode: string;
  gameName: string;
  coinsSubmitted: number;
  coinsRedeemed: number;
  /** Decimal string as returned by the backend, e.g. "15.00" — never recomputed on the client. */
  amountCredited: string;
  transactionId: string;
  status: string;
  /** Decimal string as returned by the backend, e.g. "100.00". */
  newWalletBalance: string;
}

interface RedemptionApiError {
  code: string;
  message: string;
}

interface RedemptionApiResponse {
  success: boolean;
  data?: RedemptionResult;
  error?: RedemptionApiError;
}

/** One entry from GET /api/games — lets the game read minimumCoins/conversion rate instead of hardcoding them. */
export interface GameRegistryEntry {
  code: string;
  name: string;
  minimumCoins: number;
  coinsPerConversion: number;
  rupeesPerConversion: number;
}

interface GamesListApiResponse {
  success: boolean;
  data?: GameRegistryEntry[];
}

export class RedemptionError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class GameRedemptionService {
  private pendingKey: string | null = null;
  private gameConfig: GameRegistryEntry | null = null;
  private gameConfigPromise: Promise<GameRegistryEntry | null> | null = null;

  constructor(private http: HttpClient) {}

  /** Current minimum-coins threshold — the real backend value once loaded, a conservative fallback until then. */
  get minimumCoins(): number {
    return this.gameConfig?.minimumCoins ?? FALLBACK_MIN_COINS;
  }

  isEligible(coins: number): boolean {
    return coins >= this.minimumCoins;
  }

  /** Rough pre-submission estimate from the backend's own published rate (coinsPerConversion/rupeesPerConversion). The confirmed amount always comes from the redeem response, not this. */
  estimateRupees(coins: number): number | null {
    if (!this.gameConfig || !this.gameConfig.coinsPerConversion) return null;
    return Math.round((coins / this.gameConfig.coinsPerConversion) * this.gameConfig.rupeesPerConversion * 100) / 100;
  }

  /** Fetches and caches this game's registry entry (minimumCoins, conversion rate) from GET /api/games. Safe to call repeatedly — only fetches once. */
  async ensureGameConfig(): Promise<GameRegistryEntry | null> {
    if (this.gameConfig) return this.gameConfig;
    if (!this.gameConfigPromise) {
      this.gameConfigPromise = this.loadGameConfig();
    }
    return this.gameConfigPromise;
  }

  private async loadGameConfig(): Promise<GameRegistryEntry | null> {
    try {
      const res = await firstValueFrom(this.http.get<GamesListApiResponse>(`${API_BASE_URL}/api/games`));
      const entry = res.data?.find(g => g.code === GAME_CODE) ?? null;
      if (entry) this.gameConfig = entry;
      return entry;
    } catch {
      return null;
    }
  }

  /**
   * Last mobile number the player typed for a payout, remembered only as a form-fill
   * convenience — NOT proof of account ownership. The Game Rewards API is public/unauthenticated
   * and looks the player up by this number itself, so no local "registered" identity exists here.
   */
  get lastUsedMobile(): string {
    return localStorage.getItem(LAST_MOBILE_KEY) || '';
  }

  rememberMobile(mobile: string): void {
    localStorage.setItem(LAST_MOBILE_KEY, mobile);
  }

  /** Starts a new logical redemption attempt and returns its idempotency key. Reuse the same key when retrying this same attempt. */
  beginRequest(): string {
    this.pendingKey = crypto.randomUUID();
    return this.pendingKey;
  }

  get currentIdempotencyKey(): string | null {
    return this.pendingKey;
  }

  clearPendingRequest(): void {
    this.pendingKey = null;
  }

  async submit(coins: number, mobileNumber: string, idempotencyKey: string): Promise<RedemptionResult> {
    const body: RedemptionRequest = { gameCode: GAME_CODE, mobileNumber, coins, idempotencyKey };
    let res: RedemptionApiResponse;
    try {
      res = await firstValueFrom(this.http.post<RedemptionApiResponse>(`${API_BASE_URL}/api/game-rewards/redeem`, body));
    } catch (err) {
      throw this.toRedemptionError(err);
    }
    if (!res.success || !res.data) {
      throw new RedemptionError(res.error?.message || 'Redemption could not be completed.', res.error?.code);
    }
    return res.data;
  }

  private toRedemptionError(err: unknown): RedemptionError {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as RedemptionApiResponse | null;
      const message = body?.error?.message;
      const code = body?.error?.code;
      if (message && /duplicate|already/i.test(message)) {
        return new RedemptionError('This redemption was already submitted and processed.', 'DUPLICATE_CONVERSION');
      }
      if (err.status === 429) return new RedemptionError('Too many attempts — please wait a few minutes and try again.', 'RATE_LIMITED');
      if (err.status === 0) return new RedemptionError('Network error — please check your connection and try again.', 'NETWORK_ERROR');
      if (message) return new RedemptionError(message, code);
      if (err.status >= 500) return new RedemptionError('Server error — please try again shortly.', 'SERVER_ERROR');
      return new RedemptionError('Redemption request failed. Please try again.', code);
    }
    return new RedemptionError('Redemption request failed. Please try again.');
  }
}
