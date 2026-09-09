#!/usr/bin/env node
/**
 * coverage.mjs — dataset coverage report from @tailsnconk/core.
 *
 * Purely INFORMATIONAL: prints how the catalog breaks down by spirit base,
 * ABV band, ingredient usage, zero-proof reach, and indexable hubs. It never
 * fails the build (always exits 0) — it is a "how healthy is the dataset"
 * dashboard, not a gate. Errors are caught and reported, still exit 0.
 */

function bar(n, max, width = 24) {
  if (max <= 0) return '';
  const filled = Math.round((n / max) * width);
  return '█'.repeat(filled) + '·'.repeat(width - filled);
}

function printTable(title, rows) {
  console.log(`\n${title}`);
  console.log('─'.repeat(title.length));
  if (rows.length === 0) {
    console.log('  (none)');
    return;
  }
  const labelW = Math.max(...rows.map((r) => r.label.length));
  const max = Math.max(...rows.map((r) => r.value));
  for (const r of rows) {
    const label = r.label.padEnd(labelW);
    const val = String(r.value).padStart(4);
    console.log(`  ${label}  ${val}  ${bar(r.value, max)}`);
  }
}

async function main() {
  const { tsImport } = await import('tsx/esm/api');
  const core = await tsImport('@tailsnconk/core', import.meta.url);
  const {
    COCKTAILS, COCKTAIL_META, indexableCollections,
    SPIRIT_LABELS, ABV_LABELS, SPIRIT_ORDER, ABV_ORDER,
    ingredientName,
  } = core;

  console.log(`\n=== ${core.SITE_NAME} — dataset coverage ===`);
  console.log(`Total cocktails: ${COCKTAILS.length}`);

  // --- Per spirit base ---
  const bySpirit = new Map();
  for (const c of COCKTAILS) bySpirit.set(c.spiritBase, (bySpirit.get(c.spiritBase) ?? 0) + 1);
  printTable(
    'Cocktails per spirit base',
    (SPIRIT_ORDER ?? [...bySpirit.keys()])
      .filter((k) => bySpirit.has(k))
      .map((k) => ({ label: SPIRIT_LABELS?.[k] ?? k, value: bySpirit.get(k) })),
  );

  // --- Per ABV band ---
  const byAbv = new Map();
  for (const c of COCKTAILS) byAbv.set(c.abvBand, (byAbv.get(c.abvBand) ?? 0) + 1);
  printTable(
    'Cocktails per ABV band',
    (ABV_ORDER ?? [...byAbv.keys()])
      .filter((k) => byAbv.has(k))
      .map((k) => ({ label: ABV_LABELS?.[k] ?? k, value: byAbv.get(k) })),
  );

  // --- Ingredient usage (across all recipe lines) ---
  const usage = new Map();
  for (const c of COCKTAILS) {
    for (const line of c.ingredients) {
      usage.set(line.ingredientSlug, (usage.get(line.ingredientSlug) ?? 0) + 1);
    }
  }
  const usageRows = [...usage.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug, n]) => ({ label: ingredientName ? ingredientName(slug) : slug, value: n }));
  printTable(`Ingredient usage (${usage.size} distinct)`, usageRows);

  // --- Zero-proof reach ---
  // "Inherently zero-proof" = abvBand 'zero'.
  // "Reachable" = can be adapted to a zero-proof build (supportedConstraints
  //   includes 'zero-proof', precomputed by gen:meta), OR already zero.
  const metaBySlug = new Map((COCKTAIL_META ?? []).map((m) => [m.slug, m]));
  let inherentlyZero = 0;
  let reachableZero = 0;
  for (const c of COCKTAILS) {
    const isZero = c.abvBand === 'zero';
    if (isZero) inherentlyZero++;
    const m = metaBySlug.get(c.slug);
    const canAdapt = !!m && Array.isArray(m.supportedConstraints) && m.supportedConstraints.includes('zero-proof');
    if (isZero || canAdapt) reachableZero++;
  }
  printTable('Zero-proof coverage', [
    { label: 'Inherently zero-proof', value: inherentlyZero },
    { label: 'Zero-proof reachable', value: reachableZero },
    { label: 'Alcoholic only', value: COCKTAILS.length - reachableZero },
  ]);

  // --- Indexable hubs ---
  const cols = indexableCollections(COCKTAILS);
  const byKind = new Map();
  for (const c of cols) byKind.set(c.kind, (byKind.get(c.kind) ?? 0) + 1);
  printTable(
    `Indexable collections (${cols.length} total)`,
    [...byKind.entries()].map(([kind, n]) => ({ label: kind, value: n })),
  );

  console.log('');
}

main().catch((err) => {
  console.error(`coverage: could not build report — ${err.message}`);
  // Informational only — never fail the build.
  process.exit(0);
});
