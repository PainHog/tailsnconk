import { test } from 'node:test';
import assert from 'node:assert/strict';

import { COCKTAILS } from './cocktails/index';
import { requiredSlugs, eligibleItems } from './spin';
import {
  substitutesFor,
  makeability,
  eligibleWithSubstitutions,
} from './substitution';

test('substitutesFor: bourbon <-> rye are mutual', () => {
  assert.ok(substitutesFor('bourbon').includes('rye-whiskey'));
  assert.ok(substitutesFor('rye-whiskey').includes('bourbon'));
});

test('substitutesFor: gold rum bridges light and dark families', () => {
  assert.ok(substitutesFor('gold-rum').includes('white-rum'));
  assert.ok(substitutesFor('gold-rum').includes('dark-rum'));
});

test('substitutesFor: mezcal has no substitutes (character-defining, excluded)', () => {
  assert.deepEqual(substitutesFor('mezcal'), []);
});

test('makeability: exact when every required ingredient is owned', () => {
  const c = COCKTAILS.find((x) => x.slug === 'daiquiri')!;
  const owned = new Set(requiredSlugs(c));
  assert.equal(makeability(c, owned).status, 'exact');
});

test('makeability: a rye drink is makeable-with-substitution from a bourbon bar', () => {
  const ryeDrink = COCKTAILS.find(
    (c) => requiredSlugs(c).includes('rye-whiskey') && !requiredSlugs(c).includes('bourbon'),
  );
  assert.ok(ryeDrink, 'expected at least one rye-only cocktail');
  const owned = new Set(requiredSlugs(ryeDrink!).map((s) => (s === 'rye-whiskey' ? 'bourbon' : s)));
  const m = makeability(ryeDrink!, owned);
  assert.equal(m.status, 'substitute');
  if (m.status === 'substitute') {
    assert.ok(m.substitutions.some((s) => s.required === 'rye-whiskey' && s.use === 'bourbon'));
  }
});

test('makeability: missing an un-substitutable ingredient is "no"', () => {
  const c = COCKTAILS.find((x) => x.slug === 'daiquiri')!;
  const owned = new Set(requiredSlugs(c).filter((s) => s !== 'lime-juice'));
  const m = makeability(c, owned);
  assert.equal(m.status, 'no');
  if (m.status === 'no') assert.ok(m.missing.includes('lime-juice'));
});

test('eligibleWithSubstitutions never overlaps the exact-match list', () => {
  // A whiskey-only bar: broad enough to trigger some substitutions.
  const owned = ['bourbon', 'lemon-juice', 'simple-syrup', 'soda-water', 'angostura-bitters', 'sugar'];
  const exact = new Set(eligibleItems(COCKTAILS, { owned }).map((c) => c.slug));
  const subs = eligibleWithSubstitutions(COCKTAILS, { owned });
  for (const m of subs) {
    assert.ok(!exact.has(m.cocktail.slug), `${m.cocktail.slug} is in both exact and substitute lists`);
    assert.ok(m.substitutions.length > 0, `${m.cocktail.slug} tagged substitute with no substitutions`);
  }
});

test('eligibleWithSubstitutions returns nothing in browse mode (no owned)', () => {
  assert.equal(eligibleWithSubstitutions(COCKTAILS, {}).length, 0);
});

test('eligibleWithSubstitutions respects facets', () => {
  const owned = ['bourbon', 'sweet-vermouth', 'dry-vermouth', 'angostura-bitters', 'maraschino-cherry'];
  const highOnly = eligibleWithSubstitutions(COCKTAILS, { owned, abvBand: 'high' });
  for (const m of highOnly) assert.equal(m.cocktail.abvBand, 'high');
});
