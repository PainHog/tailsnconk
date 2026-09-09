/**
 * The full cocktail catalog — concatenated from the per-spirit-base source
 * files (the blueprint's "content lives in packages/core as code" convention,
 * with per-category source files analogous to its per-continent recipe files).
 *
 * Seed dataset: ~15 validated placeholder cocktails. Replace/extend with the
 * real dataset later, then re-run `npm run gen:meta`.
 */

import type { Cocktail } from '../types';
import { WHISKEY_COCKTAILS } from './whiskey';
import { GIN_COCKTAILS } from './gin';
import { VODKA_COCKTAILS } from './vodka';
import { RUM_COCKTAILS } from './rum';
import { TEQUILA_COCKTAILS } from './tequila';
import { APERITIVO_COCKTAILS } from './aperitivo';
import { ZERO_PROOF_COCKTAILS } from './zero-proof';

export const COCKTAILS: Cocktail[] = [
  ...WHISKEY_COCKTAILS,
  ...GIN_COCKTAILS,
  ...VODKA_COCKTAILS,
  ...RUM_COCKTAILS,
  ...TEQUILA_COCKTAILS,
  ...APERITIVO_COCKTAILS,
  ...ZERO_PROOF_COCKTAILS,
];

const BY_SLUG: Map<string, Cocktail> = new Map(COCKTAILS.map((c) => [c.slug, c]));

export function getCocktail(slug: string): Cocktail | undefined {
  return BY_SLUG.get(slug);
}

export function allCocktailSlugs(): string[] {
  return COCKTAILS.map((c) => c.slug);
}
