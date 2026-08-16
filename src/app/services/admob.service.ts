import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AdMob, RewardAdPluginEvents, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Google's official public TEST ad unit IDs. The AndroidManifest now has the real AdMob App ID, but
 * these constants need separate AD UNIT IDs (format ca-app-pub-XXXX/YYYY, not the App ID's
 * ca-app-pub-XXXX~YYYY) — they must stay the shared Google test units until real ones are created
 * per ad format in the AdMob console (Ad units → Add ad unit) and swapped in here. Only then should
 * `initializeForTesting`/`isTesting` below be removed.
 * https://developers.google.com/admob/android/test-ads
 */
const TEST_REWARDED_AD_UNIT_ANDROID = 'ca-app-pub-3940256099942544/5224354917';
const TEST_BANNER_AD_UNIT_ANDROID = 'ca-app-pub-3940256099942544/6300978111';

@Injectable({ providedIn: 'root' })
export class AdMobService {
  /** AdMob's native SDK only runs inside the compiled Android/iOS app, never in a browser tab. */
  readonly isNative = Capacitor.isNativePlatform();
  private initPromise?: Promise<void>;

  initialize(): Promise<void> {
    if (!this.isNative) return Promise.resolve();
    if (!this.initPromise) {
      this.initPromise = AdMob.initialize({ initializeForTesting: true });
    }
    return this.initPromise;
  }

  /** Loads and shows a rewarded video ad. Resolves true only if the viewer watched it through and earned the reward. */
  async showRewardedAd(): Promise<boolean> {
    if (!this.isNative) return false;
    await this.initialize();

    try {
      await AdMob.prepareRewardVideoAd({ adId: TEST_REWARDED_AD_UNIT_ANDROID, isTesting: true });
    } catch {
      return false;
    }

    return new Promise<boolean>(resolve => {
      let rewarded = false;
      let rewardedHandle: PluginListenerHandle | undefined;
      let dismissedHandle: PluginListenerHandle | undefined;
      const cleanup = () => { rewardedHandle?.remove(); dismissedHandle?.remove(); };

      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true; }).then(h => rewardedHandle = h);
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => { cleanup(); resolve(rewarded); }).then(h => dismissedHandle = h);

      AdMob.showRewardVideoAd().catch(() => { cleanup(); resolve(false); });
    });
  }

  /** Shows a persistent (test-mode) AdMob banner ad docked to the bottom of the screen. No-op on web. */
  async showBanner(): Promise<void> {
    if (!this.isNative) return;
    await this.initialize();
    try {
      await AdMob.showBanner({
        adId: TEST_BANNER_AD_UNIT_ANDROID,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        isTesting: true
      });
    } catch {
      // A failed/no-fill banner isn't worth surfacing to the player.
    }
  }

  /** Removes the banner ad shown by showBanner(). Safe to call even if none is showing. */
  async hideBanner(): Promise<void> {
    if (!this.isNative) return;
    try {
      await AdMob.removeBanner();
    } catch {
      // Nothing to clean up.
    }
  }
}
