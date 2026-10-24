/** Production AdMob App ID. */
export const ADMOB_APP_ID = 'ca-app-pub-2030586584805301~3464227501';

/**
 * AdMob ad unit configuration.
 * Production ad unit IDs.
 */
export const AD_UNIT_IDS = {
  banner: 'ca-app-pub-2030586584805301/5750379412',
  interstitial: 'ca-app-pub-2030586584805301/8513022555',
  rewarded: 'ca-app-pub-2030586584805301/3200986125'
} as const;

/** Show interstitials at most once every N completed game rounds (policy-safe pacing). */
export const INTERSTITIAL_EVERY_N_ROUNDS = 2;
