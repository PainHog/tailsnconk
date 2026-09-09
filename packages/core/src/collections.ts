/**
 * CRAWLABLE HUB BUILDER (adapted from the blueprint's collections.ts).
 *
 * A hub is generated ONLY when >= MIN_COCKTAILS members qualify, so thin pages
 * never ship. A single `isIndexableCollection` gate drives both the page's
 * robots meta and the sitemap, so the two can never disagree.
 */

import type { AbvBand, Cocktail, Method, SpiritBase } from './types';

export const MIN_COCKTAILS = 4;

export type CollectionKind = 'spirit' | 'tag' | 'abv' | 'method';

export interface Collection {
  kind: CollectionKind;
  key: string;
  slug: string;
  title: string;
  description: string;
  memberSlugs: string[];
}

const SPIRIT_TITLES: Record<SpiritBase, string> = {
  whiskey: 'Whiskey Cocktails',
  gin: 'Gin Cocktails',
  vodka: 'Vodka Cocktails',
  rum: 'Rum Cocktails',
  tequila: 'Tequila Cocktails',
  brandy: 'Brandy Cocktails',
  aperitivo: 'Aperitivo Cocktails',
  other: 'Other Cocktails',
  none: 'Zero-Proof Cocktails',
};

const ABV_TITLES: Record<AbvBand, string> = {
  high: 'Spirit-Forward Cocktails',
  medium: 'Balanced Cocktails',
  low: 'Low-ABV Cocktails',
  zero: 'Zero-Proof Cocktails',
};

const METHOD_TITLES: Record<Method, string> = {
  stir: 'Stirred Cocktails',
  shake: 'Shaken Cocktails',
  build: 'Built Cocktails',
  muddle: 'Muddled Cocktails',
  blend: 'Blended Cocktails',
};

function group<T extends string>(
  cocktails: readonly Cocktail[],
  kind: CollectionKind,
  keyOf: (c: Cocktail) => T | T[],
  titleOf: (key: T) => string,
  slugPrefix: string,
): Collection[] {
  const buckets = new Map<T, string[]>();
  for (const c of cocktails) {
    const keys = keyOf(c);
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(c.slug);
    }
  }
  return [...buckets.entries()].map(([key, memberSlugs]) => ({
    kind,
    key,
    slug: `${slugPrefix}${key}`,
    title: titleOf(key),
    description: `Every cocktail in our catalog under ${titleOf(key).toLowerCase()}.`,
    memberSlugs: memberSlugs.sort(),
  }));
}

/** All candidate hubs (before the min-size gate). */
export function buildCollections(cocktails: readonly Cocktail[]): Collection[] {
  return [
    ...group<SpiritBase>(cocktails, 'spirit', (c) => c.spiritBase, (k) => SPIRIT_TITLES[k], 'spirit-'),
    ...group<AbvBand>(cocktails, 'abv', (c) => c.abvBand, (k) => ABV_TITLES[k], 'abv-'),
    ...group<Method>(cocktails, 'method', (c) => c.method, (k) => METHOD_TITLES[k], 'method-'),
    ...group<string>(cocktails, 'tag', (c) => c.tags, (k) => `${titleCase(k)} Cocktails`, 'tag-'),
  ];
}

/** The shared gate — used by both the page's robots meta and the sitemap. */
export function isIndexableCollection(collection: Collection): boolean {
  return collection.memberSlugs.length >= MIN_COCKTAILS;
}

/** Only hubs that pass the min-size gate. */
export function indexableCollections(cocktails: readonly Cocktail[]): Collection[] {
  return buildCollections(cocktails).filter(isIndexableCollection).sort((a, b) => a.slug.localeCompare(b.slug));
}

export function getCollection(cocktails: readonly Cocktail[], slug: string): Collection | undefined {
  return buildCollections(cocktails).find((c) => c.slug === slug);
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
