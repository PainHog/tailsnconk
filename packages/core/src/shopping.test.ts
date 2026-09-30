import { test } from 'node:test';
import assert from 'node:assert/strict';

import { COCKTAILS, getCocktail } from './cocktails/index';
import { requiredSlugs } from './spin';
import { ingredientUnlocks, topUnlocks, makeableAfterShopping } from './shopping';

test('ingredientUnlocks: a sole-missing ingredient is credited with the unlock', () => {
  const mojito = getCocktail('mojito')!;
  // Own everything the Mojito needs except soda water → soda-water should be an unlock.
  const owned = requiredSlugs(mojito).filter((s) => s !== 'soda-water');
  const unlocks = ingredientUnlocks(COCKTAILS, owned);
  const soda = unlocks.find((u) => u.ingredientSlug === 'soda-water');
  assert.ok(soda, 'soda-water should be an unlock');
  assert.ok(soda!.cocktailSlugs.includes('mojito'));
});

test('topUnlocks respects the limit and is sorted descending', () => {
  const top = topUnlocks(COCKTAILS, [], 5);
  assert.ok(top.length <= 5);
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1]!.unlocks >= top[i]!.unlocks);
});

test('makeableAfterShopping counts owned ∪ list', () => {
  const daiquiri = getCocktail('daiquiri')!;
  const req = requiredSlugs(daiquiri);
  const owned = req.slice(0, req.length - 1);
  const shopping = [req[req.length - 1]!];
  const before = makeableAfterShopping(COCKTAILS, owned, []);
  const after = makeableAfterShopping(COCKTAILS, owned, shopping);
  assert.ok(after > before, 'buying the last ingredient should make more cocktails');
});
