import { Injectable } from '@angular/core';
import { AudioService } from './audio.service';
import { AdmobService } from './admob.service';

export const REWARDED_AD_COOLDOWN_MS = 2 * 60 * 60 * 1000;
export const REWARDED_AD_COINS = 100;
export const REWARDED_AD_DURATION_SECONDS = 15;

@Injectable({ providedIn: 'root' })
export class RewardAdService {
  private readonly key = 'tic-rush-rewarded-ad-last-v2';
  private readonly legacyKey = 'tic-rush-rewarded-ad-last-v1';

  /** True when a real AdMob rewarded video is shown instead of the local simulated overlay. */
  readonly usesNativeAds = this.admob.isSupported;

  /** Local fullscreen simulated video overlay state (web/dev fallback only). */
  isWatching = false;
  secondsRemaining = 0;
  message = '';
  private completed = false;

  constructor(private audio: AudioService, private admob: AdmobService) {}

  get lastRewardAt(): number {
    const current = Number(localStorage.getItem(this.key));
    if (Number.isFinite(current) && current > 0) return current;
    const legacy = Number(localStorage.getItem(this.legacyKey));
    return Number.isFinite(legacy) ? legacy : 0;
  }

  get availableAt(): number {
    return this.lastRewardAt + REWARDED_AD_COOLDOWN_MS;
  }

  get canWatch(): boolean {
    return !this.isWatching && Date.now() >= this.availableAt;
  }

  get remainingMs(): number {
    return Math.max(0, this.availableAt - Date.now());
  }

  get remainingLabel(): string {
    let total = Math.ceil(this.remainingMs / 1000);
    const hours = Math.floor(total / 3600);
    total %= 3600;
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  get progress(): number {
    return this.isWatching
      ? ((REWARDED_AD_DURATION_SECONDS - this.secondsRemaining) / REWARDED_AD_DURATION_SECONDS) * 100
      : 0;
  }

  /**
   * Starts watching a rewarded video. On native platforms this always shows
   * a real AdMob rewarded ad and awaits AdMob's confirmed-reward callback
   * before resolving. On web, pass `allowSimulatedFallback: true` to open the
   * local simulated overlay for dev/testing instead of failing outright — a
   * placement can opt out of that fallback if it should only ever show real ads.
   *
   * Returns true once the reward has actually been granted (native), or once
   * the simulated overlay has started playing (web fallback — completion is
   * reported later via completeWatch()/consumeCompletedReward()).
   */
  async startWatch(options: { allowSimulatedFallback?: boolean } = {}): Promise<boolean> {
    if (!this.canWatch) return false;
    this.audio.setMusic(false);
    this.audio.setSound(true);
    this.completed = false;
    this.message = '';

    if (this.admob.isSupported) {
      this.isWatching = true;
      const granted = await this.admob.showRewarded();
      this.isWatching = false;
      this.audio.setMusic(true);
      if (granted) this.completeWatch();
      return granted;
    }

    if (options.allowSimulatedFallback === false) {
      this.audio.setMusic(true);
      return false;
    }

    this.isWatching = true;
    this.secondsRemaining = REWARDED_AD_DURATION_SECONDS;
    return true;
  }

  syncVideoTime(currentTime: number, duration: number): void {
    if (!this.isWatching) return;
    const total = Number.isFinite(duration) && duration > 0 ? duration : REWARDED_AD_DURATION_SECONDS;
    this.secondsRemaining = Math.max(0, Math.ceil(total - Math.max(0, currentTime)));
  }

  completeWatch(): void {
    if (this.completed) return;
    this.completed = true;
    this.isWatching = false;
    this.secondsRemaining = 0;
    localStorage.setItem(this.key, String(Date.now()));
    this.message = `Reward earned: +${REWARDED_AD_COINS} coins`;
  }

  consumeCompletedReward(): boolean {
    if (!this.completed || !this.message) return false;
    this.completed = false;
    this.message = '';
    return true;
  }

  cancelWatch(): void {
    this.isWatching = false;
    this.completed = false;
    this.secondsRemaining = 0;
    this.message = '';
  }
}
