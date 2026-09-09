/**
 * Display labels for the facets (kept in core so the app and any generated
 * output show identical strings). Niche-specific vocabulary.
 */

import type { AbvBand, Method, SpiritBase } from './types';

export const SPIRIT_LABELS: Record<SpiritBase, string> = {
  whiskey: 'Whiskey',
  gin: 'Gin',
  vodka: 'Vodka',
  rum: 'Rum',
  tequila: 'Tequila',
  brandy: 'Brandy',
  aperitivo: 'Aperitivo',
  other: 'Other',
  none: 'Zero-proof',
};

export const ABV_LABELS: Record<AbvBand, string> = {
  high: 'Spirit-forward',
  medium: 'Balanced',
  low: 'Low-ABV',
  zero: 'Zero-proof',
};

export const METHOD_LABELS: Record<Method, string> = {
  stir: 'Stir',
  shake: 'Shake',
  build: 'Build',
  muddle: 'Muddle',
  blend: 'Blend',
};

/** Ordered spirit bases for facet chips. */
export const SPIRIT_ORDER: SpiritBase[] = [
  'whiskey',
  'gin',
  'vodka',
  'rum',
  'tequila',
  'brandy',
  'aperitivo',
  'other',
  'none',
];

export const ABV_ORDER: AbvBand[] = ['high', 'medium', 'low', 'zero'];
