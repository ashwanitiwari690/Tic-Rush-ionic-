import { Injectable, inject } from '@angular/core';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import {
  AdMob,
  AdmobConsentStatus,
  BannerAdOptions,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents
} from '@capacitor-community/admob';
import {
  ADMOB_CONFIG,
  INTERSTITIAL_EVERY_N_ROUNDS,
  INTERSTITIAL_MIN_INTERVAL_MS,
  getAdUnitId
} from '../config/admob.config';
import { AudioService } from './audio.service';

/**
 * Enterprise-grade AdMob service wrapper for Tic Rush.
 * Handles initialization, UMP GDPR/Privacy consent, adaptive banners,
 * policy-compliant interstitials at natural breakpoints, and verified rewarded video ads.
 */
@Injectable({ providedIn: 'root' })
export class AdmobService {
  private readonly audio = inject(AudioService);
  readonly isSupported = Capacitor.isNativePlatform();

  private initPromise?: Promise<void>;
  private isInitialized = false;

  // Banner state
  private bannerVisible = false;
  private bannerLoading = false;
  private bannerRetryIndex = 0;
  private bannerRetryTimer?: number;
  private bannerListenerHandles: PluginListenerHandle[] = [];

  // Interstitial state
  private interstitialReady = false;
  private interstitialLoading = false;
  private interstitialActive = false;
  private roundsSinceInterstitial = 0;
  private lastInterstitialTime = 0;

  // Rewarded state
  private rewardedReady = false;
  private rewardedLoading = false;
  private rewardedActive = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkRestored());
    }
  }

  private log(message: string, ...details: unknown[]): void {
    if (ADMOB_CONFIG.debugLogging) {
      console.log(`[AdMob] ${message}`, ...details);
    }
  }

  private warn(message: string, ...details: unknown[]): void {
    if (ADMOB_CONFIG.debugLogging) {
      console.warn(`[AdMob WARN] ${message}`, ...details);
    }
  }

  private error(message: string, ...details: unknown[]): void {
    if (ADMOB_CONFIG.debugLogging) {
      console.error(`[AdMob ERROR] ${message}`, ...details);
    }
  }

  /**
   * Initializes the Google Mobile Ads SDK and handles UMP consent requirements.
   * Safe to call multiple times; returns the same initialization promise.
   */
  async initialize(): Promise<void> {
    if (!this.isSupported) {
      this.log('Web environment detected — native AdMob disabled.');
      return;
    }
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.log('Checking UMP Consent info...');
        try {
          const consentInfo = await AdMob.requestConsentInfo();
          this.log('Consent info status:', consentInfo.status);
          if (consentInfo.status === AdmobConsentStatus.REQUIRED && consentInfo.isConsentFormAvailable) {
            this.log('Showing UMP consent form...');
            await AdMob.showConsentForm();
          }
        } catch (consentErr) {
          this.warn('Consent check bypassed or failed (non-blocking):', consentErr);
        }

        this.log('Initializing Google Mobile Ads SDK...');
        await AdMob.initialize({
          testingDevices: ADMOB_CONFIG.testingDevices,
          initializeForTesting: ADMOB_CONFIG.useTestAds
        });
        this.isInitialized = true;
        this.log('Google Mobile Ads SDK initialized successfully.');

        // Eagerly preload interstitial and rewarded video in the background
        void this.preloadInterstitial();
        void this.preloadRewarded();
      } catch (err) {
        this.error('Failed to initialize AdMob SDK:', err);
      }
    })();

    return this.initPromise;
  }

  /**
   * Shows the persistent bottom anchored adaptive banner.
   * Safe to call repeatedly; avoids duplicate views and manages failure retries.
   */
  async showBanner(): Promise<void> {
    if (!this.isSupported) return;
    await this.initialize();

    if (this.bannerVisible || this.bannerLoading) {
      return;
    }

    this.bannerLoading = true;
    if (this.bannerRetryTimer !== undefined) {
      window.clearTimeout(this.bannerRetryTimer);
      this.bannerRetryTimer = undefined;
    }

    await this.setupBannerListeners();

    const options: BannerAdOptions = {
      adId: getAdUnitId('banner'),
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0
    };

    try {
      this.log('Requesting banner ad...');
      await AdMob.showBanner(options);
    } catch (err) {
      this.error('AdMob.showBanner exception:', err);
      this.bannerLoading = false;
      this.bannerVisible = false;
      this.setBannerSpace(0);
      this.scheduleBannerRetry();
    }
  }

  private async setupBannerListeners(): Promise<void> {
    if (this.bannerListenerHandles.length > 0) return;

    try {
      const sizeHandle = await AdMob.addListener(BannerAdPluginEvents.SizeChanged, info => {
        this.log('Banner size changed:', info.height);
        this.setBannerSpace(info.height);
      });
      this.bannerListenerHandles.push(sizeHandle);

      const loadedHandle = await AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
        this.log('Banner loaded successfully.');
        this.bannerVisible = true;
        this.bannerLoading = false;
        this.bannerRetryIndex = 0;
      });
      this.bannerListenerHandles.push(loadedHandle);

      const failHandle = await AdMob.addListener(BannerAdPluginEvents.FailedToLoad, error => {
        this.warn('Banner failed to load:', error);
        this.bannerVisible = false;
        this.bannerLoading = false;
        this.setBannerSpace(0);
        this.scheduleBannerRetry();
      });
      this.bannerListenerHandles.push(failHandle);

      const openHandle = await AdMob.addListener(BannerAdPluginEvents.Opened, () => {
        this.log('Banner opened / clicked by user.');
      });
      this.bannerListenerHandles.push(openHandle);

      const closeHandle = await AdMob.addListener(BannerAdPluginEvents.Closed, () => {
        this.log('Banner closed.');
      });
      this.bannerListenerHandles.push(closeHandle);
    } catch (err) {
      this.warn('Failed to attach banner listeners:', err);
    }
  }

  private scheduleBannerRetry(): void {
    if (this.bannerRetryIndex >= ADMOB_CONFIG.bannerRetryDelaysMs.length) {
      this.log('Max banner retries reached. Will wait for network change or user interaction.');
      return;
    }
    const delay = ADMOB_CONFIG.bannerRetryDelaysMs[this.bannerRetryIndex++];
    this.log(`Scheduling banner retry #${this.bannerRetryIndex} in ${delay}ms...`);
    this.bannerRetryTimer = window.setTimeout(() => {
      this.bannerRetryTimer = undefined;
      void this.showBanner();
    }, delay);
  }

  private setBannerSpace(heightPx: number): void {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--ad-banner-space', `${Math.max(0, heightPx)}px`);
    }
  }

  /**
   * Preloads an interstitial ad in the background.
   */
  async preloadInterstitial(): Promise<void> {
    if (!this.isSupported || this.interstitialReady || this.interstitialLoading || this.interstitialActive) {
      return;
    }
    this.interstitialLoading = true;
    try {
      this.log('Preloading interstitial ad...');
      await AdMob.prepareInterstitial({ adId: getAdUnitId('interstitial') });
      this.interstitialReady = true;
      this.log('Interstitial ad preloaded and ready.');
    } catch (err) {
      this.warn('Interstitial failed to preload:', err);
      this.interstitialReady = false;
    } finally {
      this.interstitialLoading = false;
    }
  }

  /**
   * Shows an interstitial only at natural gameplay transition points (game over, round reset, run end).
   * Enforces pacing: requires at least INTERSTITIAL_EVERY_N_ROUNDS rounds AND a 60s cooldown.
   * Returns true only if an interstitial was actually displayed.
   */
  async maybeShowInterstitialAtBreakpoint(): Promise<boolean> {
    if (!this.isSupported) return false;
    this.roundsSinceInterstitial++;
    const now = Date.now();
    const timeSinceLast = now - this.lastInterstitialTime;

    this.log(`Breakpoint hit: rounds=${this.roundsSinceInterstitial}/${INTERSTITIAL_EVERY_N_ROUNDS}, elapsed=${Math.round(timeSinceLast / 1000)}s/60s`);

    if (this.roundsSinceInterstitial < INTERSTITIAL_EVERY_N_ROUNDS || timeSinceLast < INTERSTITIAL_MIN_INTERVAL_MS) {
      return false;
    }

    const shown = await this.showInterstitial();
    if (shown) {
      this.roundsSinceInterstitial = 0;
      this.lastInterstitialTime = Date.now();
    }
    return shown;
  }

  /**
   * Shows the prepared interstitial ad, safely pauses background audio,
   * waits for the user to dismiss the ad, resumes audio, and preloads the next ad.
   */
  async showInterstitial(): Promise<boolean> {
    if (!this.isSupported || this.interstitialActive) return false;
    await this.initialize();

    if (!this.interstitialReady) {
      this.log('Interstitial not preloaded, attempting quick load (up to 3s)...');
      await Promise.race([
        this.preloadInterstitial(),
        new Promise<void>(resolve => setTimeout(resolve, 3000))
      ]);
    }

    if (!this.interstitialReady) {
      this.log('No interstitial available to show.');
      return false;
    }

    this.interstitialReady = false;
    this.interstitialActive = true;

    // Pause audio while interstitial is visible
    this.audio.stopMusic();

    return new Promise<boolean>(resolve => {
      let settled = false;
      const handles: Promise<PluginListenerHandle>[] = [];
      const cleanup = () => {
        handles.forEach(h => h.then(handle => handle.remove()).catch(() => {}));
      };

      const finish = (shown: boolean) => {
        if (settled) return;
        settled = true;
        this.interstitialActive = false;
        cleanup();
        if (shown) {
          this.lastInterstitialTime = Date.now();
        }
        // Preload next interstitial after current one closes
        void this.preloadInterstitial();
        resolve(shown);
      };

      // Safety timeout: resolve if native dismissal event fails to fire within 60s
      const timeoutId = window.setTimeout(() => {
        this.warn('Interstitial dismissal timeout reached.');
        finish(true);
      }, 60000);

      handles.push(
        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          this.log('Interstitial dismissed by user.');
          window.clearTimeout(timeoutId);
          finish(true);
        })
      );

      handles.push(
        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, err => {
          this.error('Interstitial failed to show:', err);
          window.clearTimeout(timeoutId);
          finish(false);
        })
      );

      AdMob.showInterstitial()
        .then(() => {
          this.log('Interstitial presented on screen.');
        })
        .catch(err => {
          this.error('AdMob.showInterstitial rejected:', err);
          window.clearTimeout(timeoutId);
          finish(false);
        });
    });
  }

  /**
   * Preloads a rewarded video ad in the background.
   */
  async preloadRewarded(): Promise<void> {
    if (!this.isSupported || this.rewardedReady || this.rewardedLoading || this.rewardedActive) {
      return;
    }
    this.rewardedLoading = true;
    try {
      this.log('Preloading rewarded video ad...');
      await AdMob.prepareRewardVideoAd({ adId: getAdUnitId('rewarded') });
      this.rewardedReady = true;
      this.log('Rewarded video ad preloaded and ready.');
    } catch (err) {
      this.warn('Rewarded video failed to preload:', err);
      this.rewardedReady = false;
    } finally {
      this.rewardedLoading = false;
    }
  }

  /**
   * Shows a rewarded video ad.
   * Resolves true ONLY when the user watches the ad completely and AdMob emits the Rewarded event.
   * If dismissed early or failed to show, resolves false with 0 reward granted.
   */
  async showRewarded(): Promise<boolean> {
    if (!this.isSupported || this.rewardedActive) return false;
    await this.initialize();

    if (!this.rewardedReady) {
      this.log('Rewarded video not ready, attempting to load...');
      await this.preloadRewarded();
    }
    if (!this.rewardedReady) {
      this.warn('No rewarded video ad ready to show.');
      return false;
    }

    this.rewardedReady = false;
    this.rewardedActive = true;

    // Pause audio while rewarded ad is playing
    this.audio.stopMusic();

    return new Promise<boolean>(resolve => {
      let settled = false;
      let userEarnedReward = false;
      const handles: Promise<PluginListenerHandle>[] = [];

      const cleanup = () => {
        handles.forEach(h => h.then(handle => handle.remove()).catch(() => {}));
      };

      const finish = (granted: boolean) => {
        if (settled) return;
        settled = true;
        this.rewardedActive = false;
        cleanup();
        // Eagerly preload the next rewarded ad
        void this.preloadRewarded();
        resolve(granted);
      };

      // Safety timeout in case ad hangs or app is suspended
      const timeoutId = window.setTimeout(() => {
        this.warn('Rewarded ad timeout reached.');
        finish(userEarnedReward);
      }, 90000);

      // Event 1: User completed the required watch time
      handles.push(
        AdMob.addListener(RewardAdPluginEvents.Rewarded, rewardItem => {
          this.log('AdMob confirmed user earned reward:', rewardItem);
          userEarnedReward = true;
        })
      );

      // Event 2: Ad is closed / dismissed (either after earning reward or early exit)
      handles.push(
        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          this.log(`Rewarded video dismissed. Reward earned: ${userEarnedReward}`);
          window.clearTimeout(timeoutId);
          finish(userEarnedReward);
        })
      );

      // Event 3: Ad failed to show
      handles.push(
        AdMob.addListener(RewardAdPluginEvents.FailedToShow, err => {
          this.error('Rewarded video failed to show:', err);
          window.clearTimeout(timeoutId);
          finish(false);
        })
      );

      AdMob.showRewardVideoAd()
        .then(result => {
          this.log('AdMob.showRewardVideoAd completed:', result);
          if (result && result.amount) {
            userEarnedReward = true;
          }
        })
        .catch(err => {
          this.error('AdMob.showRewardVideoAd call failed:', err);
          window.clearTimeout(timeoutId);
          finish(false);
        });
    });
  }

  private handleNetworkRestored(): void {
    this.log('Network connectivity restored.');
    if (!this.bannerVisible && !this.bannerLoading) {
      this.bannerRetryIndex = 0;
      void this.showBanner();
    }
    if (!this.interstitialReady && !this.interstitialLoading) {
      void this.preloadInterstitial();
    }
    if (!this.rewardedReady && !this.rewardedLoading) {
      void this.preloadRewarded();
    }
  }
}
