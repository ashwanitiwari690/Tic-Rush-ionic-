/**
 * AdMob Configuration for Tic Rush
 * Supports production and official Google test ad units.
 */

/** Production AdMob App ID. */
export const ADMOB_APP_ID = 'ca-app-pub-2030586584805301~3464227501';

/** Official Google sample test App ID for Android development. */
export const TEST_ADMOB_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

/**
 * Production AdMob Ad Unit IDs.
 * Generated from the Google AdMob Console for Tic Rush (Android).
 */
export const PRODUCTION_AD_UNIT_IDS = {
  banner: 'ca-app-pub-2030586584805301/5750379412',
  interstitial: 'ca-app-pub-2030586584805301/8513022555',
  rewarded: 'ca-app-pub-2030586584805301/3200986125'
} as const;

/**
 * Official Google sample test Ad Unit IDs.
 * Guaranteed to return test ads on any device or emulator without risking policy strikes.
 */
export const TEST_AD_UNIT_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917'
} as const;

export interface AdMobSettings {
  /** When true, forces official Google test ad units instead of live production units. */
  useTestAds: boolean;
  /** Test device hashed IDs (from Logcat) for testing live production units safely on test devices. */
  testingDevices: string[];
  /** Enable diagnostic logging in development. */
  debugLogging: boolean;
  /** Minimum game rounds between interstitials. */
  interstitialEveryNRounds: number;
  /** Minimum cooldown between interstitials in milliseconds. */
  interstitialMinIntervalMs: number;
  /** Retry delays in milliseconds for banner reloading upon failure. */
  bannerRetryDelaysMs: number[];
}

export const ADMOB_CONFIG: AdMobSettings = {
  useTestAds: false, // Set to true during dev testing with sample units
  testingDevices: [],
  debugLogging: true,
  interstitialEveryNRounds: 2,
  interstitialMinIntervalMs: 60 * 1000, // 60 seconds
  bannerRetryDelaysMs: [5000, 15000, 30000]
};

/** Active ad unit IDs (defaults to production units unless useTestAds is true). */
export const AD_UNIT_IDS = ADMOB_CONFIG.useTestAds ? TEST_AD_UNIT_IDS : PRODUCTION_AD_UNIT_IDS;

export const INTERSTITIAL_EVERY_N_ROUNDS = ADMOB_CONFIG.interstitialEveryNRounds;
export const INTERSTITIAL_MIN_INTERVAL_MS = ADMOB_CONFIG.interstitialMinIntervalMs;

export function getAdUnitId(type: 'banner' | 'interstitial' | 'rewarded'): string {
  const units = ADMOB_CONFIG.useTestAds ? TEST_AD_UNIT_IDS : PRODUCTION_AD_UNIT_IDS;
  return units[type];
}
