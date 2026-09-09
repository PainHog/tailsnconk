/**
 * Public, build-inlined configuration. Only EXPO_PUBLIC_* vars are readable
 * here (anon-safe). Never reference a server secret in app source — the
 * `check:secrets` script fails the build if one leaks in.
 */

export const ENV = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  siteUrl: process.env.EXPO_PUBLIC_SITE_URL ?? 'https://tailsnconk.com',
  adProvider: process.env.EXPO_PUBLIC_AD_PROVIDER ?? '',
  adClientId: process.env.EXPO_PUBLIC_AD_CLIENT_ID ?? '',
} as const;

/** True in a production build (Expo sets NODE_ENV=production for exports). */
export const IS_PROD = process.env.NODE_ENV === 'production';

/** True when the cloud backend is configured; otherwise the app runs local. */
export const HAS_SUPABASE = Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);

/** True when we're rendering on the web platform. */
export const IS_WEB = typeof document !== 'undefined';
