/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 * Produced by apps/mobile/scripts/fetch-overrides.mjs during the web export.
 * Empty when Supabase env is absent; that is expected on local/PR builds.
 */

export const BAKED_OVERRIDES: Record<string, string> = {};

export function override(key: string, fallback: string): string {
  return BAKED_OVERRIDES[key] ?? fallback;
}
