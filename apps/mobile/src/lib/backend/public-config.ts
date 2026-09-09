/**
 * Public anon backend config (blueprint's public-config.ts). URL + anon
 * publishable key are anon-safe by design; they come from EXPO_PUBLIC_* env at
 * build time. NEVER put the service-role key here.
 */

import { ENV } from '../env';

export const PUBLIC_CONFIG = {
  url: ENV.supabaseUrl,
  anonKey: ENV.supabaseAnonKey,
} as const;
