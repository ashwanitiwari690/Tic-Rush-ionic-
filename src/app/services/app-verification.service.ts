import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { AdvertisingId } from '@capacitor-community/advertising-id';

/** Earnivo Central Backend host — same host as the Games/Game Rewards APIs. */
const API_BASE_URL = 'https://api.admobility.in';

/** This game's "App Promotion" campaign API key, from the Earnivo agent panel. Single source — do not repeat this string elsewhere. */
const CAMPAIGN_API_KEY = 'ak_d08cfadf4b361791aab7cafcb6a1497729274071a0bd890c';

interface ConfirmApiResponse {
  success: boolean;
  data?: { status: string; rewardAmount: string };
  error?: { code: string; message: string };
}

/**
 * Confirms Earnivo's "App Promotion" task from this device so Earnivo can credit the
 * user's reward. Matching is by OS-level Advertising ID (GAID/IDFA), not by account, so
 * this must run on every launch rather than only after a fresh install — see
 * APP_PROMOTION_VERIFICATION_INTEGRATION.md.
 */
@Injectable({ providedIn: 'root' })
export class AppVerificationService {
  constructor(private http: HttpClient) {}

  /** Safe to call on every app launch: a 422 ("nothing pending") is the normal, silent outcome. */
  async verify(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const advertisingId = await this.readAdvertisingId();
    if (!advertisingId) return;

    try {
      await firstValueFrom(
        this.http.post<ConfirmApiResponse>(`${API_BASE_URL}/api/app-verification/confirm`, {
          apiKey: CAMPAIGN_API_KEY,
          advertisingId
        })
      );
    } catch {
      // 422 = no pending verification yet (normal); 403 = misconfigured apiKey. Neither is user-facing.
    }
  }

  private async readAdvertisingId(): Promise<string | null> {
    try {
      if (Capacitor.getPlatform() === 'ios') {
        await AdvertisingId.requestTracking();
      }
      const { id, status } = await AdvertisingId.getAdvertisingId();
      if (status !== 'Authorized' || !id || /^0+$/.test(id)) return null;
      return id;
    } catch {
      return null;
    }
  }
}
