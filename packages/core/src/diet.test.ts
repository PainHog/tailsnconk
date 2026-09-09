import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getCocktail } from './cocktails/index';
import { adaptCocktail, canGoZeroProof, supportedConstraints } from './diet';
import { isAlcoholic } from './ingredients';

test('zero-proof: the base spirit is swapped and the drink fully resolves', () => {
  const oldFashioned = getCocktail('old-fashioned')!;
  const adapted = adaptCocktail(oldFashioned, ['zero-proof']);
  assert.ok(adapted.fullyResolved);
  const bourbon = adapted.parts.find((p) => p.ingredientSlug === 'bourbon')!;
  assert.equal(bourbon.status, 'swapped');
  assert.equal(bourbon.replacementSlug, 'na-whiskey');
});

test('zero-proof: an equal-parts spirit drink resolves all three parts', () => {
  const negroni = getCocktail('negroni')!;
  assert.ok(canGoZeroProof(negroni));
  const adapted = adaptCocktail(negroni, ['zero-proof']);
  const swapped = adapted.parts.filter((p) => p.status === 'swapped').map((p) => p.ingredientSlug);
  assert.deepEqual(swapped.sort(), ['campari', 'gin', 'sweet-vermouth']);
});

test('COMBINABLE: zero-proof + egg-free together leave nothing violating either', () => {
  const sour = getCocktail('whiskey-sour')!;
  const adapted = adaptCocktail(sour, ['zero-proof', 'egg-free']);
  assert.ok(adapted.fullyResolved);
  // No surviving part may still carry alcohol...
  for (const p of adapted.parts) {
    const effectiveSlug = p.status === 'swapped' ? p.replacementSlug! : p.ingredientSlug;
    assert.ok(!isAlcoholic(effectiveSlug), `${effectiveSlug} still alcoholic`);
  }
  // ...and the egg white must be swapped for aquafaba.
  const egg = adapted.parts.find((p) => p.ingredientSlug === 'egg-white')!;
  assert.equal(egg.status, 'swapped');
  assert.equal(egg.replacementSlug, 'aquafaba');
});

test('supportedConstraints reflects what the rewrite can actually satisfy', () => {
  const sour = getCocktail('whiskey-sour')!;
  const supported = supportedConstraints(sour);
  assert.ok(supported.includes('zero-proof'));
  assert.ok(supported.includes('egg-free'));
});

test('a natively zero-proof drink keeps every part under zero-proof', () => {
  const virgin = getCocktail('virgin-mojito')!;
  const adapted = adaptCocktail(virgin, ['zero-proof']);
  assert.ok(adapted.fullyResolved);
  assert.ok(adapted.parts.every((p) => p.status === 'kept'));
});
