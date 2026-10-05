import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LIMIT, MAX_LIMIT, readWallParams } from './params.ts';

const FN_URL = 'https://example.supabase.co/functions/v1/wall-photos';

// What supabase-js functions.invoke('wall-photos', { body: { cocktail_id } })
// sends: a POST with a JSON body and no query string.
function invokeLike(body: unknown): Request {
  return new Request(FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('app path: JSON body cocktail_id is read', async () => {
  const p = await readWallParams(invokeLike({ cocktail_id: 'negroni' }));
  assert.deepEqual(p, { cocktailId: 'negroni', weekKey: null, limit: DEFAULT_LIMIT });
});

test('JSON body week_key and limit are read and limit is clamped', async () => {
  assert.deepEqual(await readWallParams(invokeLike({ week_key: '2026-W40', limit: 5 })), {
    cocktailId: null,
    weekKey: '2026-W40',
    limit: 5,
  });
  assert.equal((await readWallParams(invokeLike({ limit: 10_000 })))?.limit, MAX_LIMIT);
  assert.equal((await readWallParams(invokeLike({ limit: 0 })))?.limit, 1);
  assert.equal((await readWallParams(invokeLike({ limit: 'lots' })))?.limit, DEFAULT_LIMIT);
});

test('GET query string still works', async () => {
  const p = await readWallParams(new Request(`${FN_URL}?cocktail_id=daiquiri&week_key=2026-W40&limit=500`));
  assert.deepEqual(p, { cocktailId: 'daiquiri', weekKey: '2026-W40', limit: MAX_LIMIT });
});

test('body value wins over the query string on POST', async () => {
  const req = new Request(`${FN_URL}?cocktail_id=from-query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cocktail_id: 'from-body' }),
  });
  assert.equal((await readWallParams(req))?.cocktailId, 'from-body');
});

test('non-string filters are ignored', async () => {
  const p = await readWallParams(invokeLike({ cocktail_id: 42, week_key: ['x'] }));
  assert.deepEqual(p, { cocktailId: null, weekKey: null, limit: DEFAULT_LIMIT });
});

test('empty POST body means no filters', async () => {
  const p = await readWallParams(new Request(FN_URL, { method: 'POST' }));
  assert.deepEqual(p, { cocktailId: null, weekKey: null, limit: DEFAULT_LIMIT });
});

test('malformed or non-object JSON body is rejected', async () => {
  const bad = new Request(FN_URL, { method: 'POST', body: '{not json' });
  assert.equal(await readWallParams(bad), null);
  assert.equal(await readWallParams(invokeLike(['negroni'])), null);
  assert.equal(await readWallParams(invokeLike(null)), null);
});
