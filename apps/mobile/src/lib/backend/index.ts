/**
 * Backend selector (blueprint §5.0). Picks the cloud implementation when the
 * public Supabase config is present, else the on-device local one. A singleton
 * so auth/session state is shared across the app.
 */

import { HAS_SUPABASE } from '../env';
import type { Backend } from './types';
import { LocalBackend } from './local';

let instance: Backend | null = null;

export function backend(): Backend {
  if (instance) return instance;
  if (HAS_SUPABASE) {
    // Lazy require so local-only builds never pull the Supabase client.
    const { SupabaseBackend } = require('./supabase') as typeof import('./supabase');
    instance = new SupabaseBackend();
  } else {
    instance = new LocalBackend();
  }
  return instance;
}

export type { Backend } from './types';
export * from './types';
