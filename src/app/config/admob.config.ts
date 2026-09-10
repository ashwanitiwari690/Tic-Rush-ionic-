/**
 * AdMob ad unit configuration.
 *
 * These are Google's official sample ad unit IDs — they always serve a clearly
 * labeled "Test Ad" and are safe to ship during development (real ad unit IDs
 * used with unapproved apps/test devices can get an AdMob account flagged for
 * invalid traffic). See https://developers.google.com/admob/android/test-ads
 *
 * Before releasing to production, replace every value below with the real ad
 * unit IDs created in the AdMob console for this app (the app's AdMob App ID
 * itself is already live — see android/app/src/main/res/values/strings.xml).
 */
export const AD_UNIT_IDS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917'
} as const;

/** Show interstitials at most once every N completed game rounds (policy-safe pacing). */
export const INTERSTITIAL_EVERY_N_ROUNDS = 2;
