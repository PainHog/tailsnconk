/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 * Produced by apps/mobile/scripts/fetch-ratings.mjs during the web export.
 * Empty when Supabase env is absent; that is expected on local/PR builds.
 */

export interface BakedRating {
  ratingValue: number;
  reviewCount: number;
}

export const BAKED_RATINGS: Record<string, BakedRating> = {};

export function bakedRating(cocktailId: string): BakedRating | undefined {
  return BAKED_RATINGS[cocktailId];
}
