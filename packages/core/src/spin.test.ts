import { test } from 'node:test';
import assert from 'node:assert/strict';

import { COCKTAILS, getCocktail } from './cocktails/index';
import {
  eligibleItems,
  cocktailMatches,
  trySpin,
  almostMakeable,
  withoutRecentBases,
  rememberBase,
  canMakeWith,
  requiredSlugs,
} from './spin';
import type { Cocktail } from './types';

const ALL_SLUGS = new Set(COCKTAILS.map((c) => c.slug));

test('availability: a fully stocked bar can make everything', () => {
  const everything = new Set<string>();
  for (const c of COCKTAILS) for (const i of c.ingredients) everything.add(i.ingredientSlug);
  const owned = [...everything];
  const list = eligibleItems(COCKTAILS, { owned });
  assert.equal(list.length, COCKTAILS.length);
});

test('availability: empty bar can make nothing', () => {
  assert.equal(eligibleItems(COCKTAILS, { owned: [] }).length, 0);
});

test('availability: owned set must contain every REQUIRED ingredient', () => {
  const daiquiri = getCocktail('daiquiri')!;
  const owned = new Set(requiredSlugs(daiquiri));
  assert.ok(canMakeWith(daiquiri, owned));
  // A rum/lime/syrup bar makes the Daiquiri but not the Mojito (needs mint + soda).
  const list = eligibleItems(COCKTAILS, { owned: [...owned] });
  assert.deepEqual(list.map((c) => c.slug), ['daiquiri']);
});

test('availability: optional ingredients never block', () => {
  const daiquiri = getCocktail('daiquiri')!;
  // Owner has no lime garnish (optional) — still makeable.
  const owned = requiredSlugs(daiquiri);
  assert.ok(canMakeWith(daiquiri, new Set(owned)));
});

test('facets: zeroProof only returns ABV band zero', () => {
  const list = eligibleItems(COCKTAILS, { zeroProof: true });
  assert.ok(list.length >= 1);
  assert.ok(list.every((c) => c.abvBand === 'zero'));
});

test('facets: spiritBase pin filters to that base', () => {
  const list = eligibleItems(COCKTAILS, { spiritBase: 'gin' });
  assert.ok(list.length >= 1);
  assert.ok(list.every((c) => c.spiritBase === 'gin'));
});

test('facets combine (ANDed): base + abv', () => {
  const list = eligibleItems(COCKTAILS, { spiritBase: 'whiskey', abvBand: 'high' });
  assert.ok(list.every((c) => c.spiritBase === 'whiskey' && c.abvBand === 'high'));
});

test('cocktailMatches: undefined owned = browse mode (availability ignored)', () => {
  assert.ok(COCKTAILS.every((c) => cocktailMatches(c, {})));
});

test('secondary spin: deterministic with injected rng, always in eligible set', () => {
  const result = trySpin(COCKTAILS, {}, () => 0);
  assert.ok(result);
  assert.ok(ALL_SLUGS.has(result!.cocktail.slug));
});

test('secondary spin: returns undefined when nothing matches', () => {
  const result = trySpin(COCKTAILS, { owned: [] });
  assert.equal(result, undefined);
});

test('no-repeat lockout stands down rather than emptying the pool', () => {
  const rumOnly: Cocktail[] = COCKTAILS.filter((c) => c.spiritBase === 'rum');
  const recent = rememberBase([], 'rum');
  // Every candidate is rum, so the lockout must stand down and keep the pool.
  assert.equal(withoutRecentBases(rumOnly, recent).length, rumOnly.length);
});

test('almostMakeable: cocktails missing exactly one required ingredient', () => {
  const mojito = getCocktail('mojito')!;
  // Own everything the Mojito needs EXCEPT soda water.
  const owned = requiredSlugs(mojito).filter((s) => s !== 'soda-water');
  const almost = almostMakeable(COCKTAILS, { owned });
  const mojitoRow = almost.find((a) => a.cocktail.slug === 'mojito');
  assert.ok(mojitoRow, 'Mojito should be one purchase away');
  assert.equal(mojitoRow!.missing, 'soda-water');
});
