/**
 * gen:meta — codegen step (blueprint's scripts/ gen:meta).
 *
 * Walks the cocktail catalog and writes two generated files:
 *   - cocktails-meta.gen.ts  — cheap per-cocktail filter metadata the discovery
 *                              engine uses (required/optional slugs, supported
 *                              constraints), so filtering never touches heavy data.
 *   - cocktails-audit.gen.ts — a quality-audit snapshot (referential integrity,
 *                              coverage per base spirit, zero-proof reach).
 *
 * Run: `npm run gen:meta`. Re-run whenever the dataset changes.
 * Exits non-zero if the catalog references an unknown ingredient slug.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { COCKTAILS } from '../cocktails/index';
import { INGREDIENTS, getIngredient } from '../ingredients';
import { requiredSlugs, optionalSlugs } from '../spin';
import { supportedConstraints, canGoZeroProof } from '../diet';
import type { CocktailMeta } from '../types';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..');

const HEADER = `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 * Produced by \`npm run gen:meta\` (packages/core/src/scripts/gen-meta.ts).
 * Regenerate after changing the cocktail catalog or ingredient table.
 */\n\n`;

function buildMeta(): CocktailMeta[] {
  return COCKTAILS.map((c) => ({
    slug: c.slug,
    spiritBase: c.spiritBase,
    abvBand: c.abvBand,
    required: requiredSlugs(c),
    optional: optionalSlugs(c),
    supportedConstraints: supportedConstraints(c),
  }));
}

function auditIntegrity(): string[] {
  const issues: string[] = [];
  const usedSlugs = new Set<string>();
  for (const c of COCKTAILS) {
    if (c.ingredients.filter((i) => !i.optional).length === 0) {
      issues.push(`${c.slug}: has no required ingredients`);
    }
    for (const line of c.ingredients) {
      usedSlugs.add(line.ingredientSlug);
      if (!getIngredient(line.ingredientSlug)) {
        issues.push(`${c.slug}: references unknown ingredient "${line.ingredientSlug}"`);
      }
    }
  }
  // Warn (not fail) about ingredients defined but never used.
  for (const ing of INGREDIENTS) {
    if (!usedSlugs.has(ing.slug)) issues.push(`WARN unused ingredient "${ing.slug}"`);
  }
  return issues;
}

function coverageByBase(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of COCKTAILS) out[c.spiritBase] = (out[c.spiritBase] ?? 0) + 1;
  return out;
}

function main(): void {
  const meta = buildMeta();
  const issues = auditIntegrity();
  const errors = issues.filter((i) => !i.startsWith('WARN'));
  const warnings = issues.filter((i) => i.startsWith('WARN'));

  const metaOut =
    HEADER +
    `import type { CocktailMeta } from './types';\n\n` +
    `export const COCKTAIL_META: CocktailMeta[] = ${JSON.stringify(meta, null, 2)};\n`;
  writeFileSync(join(OUT_DIR, 'cocktails-meta.gen.ts'), metaOut);

  const audit = {
    totalCocktails: COCKTAILS.length,
    totalIngredients: INGREDIENTS.length,
    coverageByBase: coverageByBase(),
    zeroProofReachable: COCKTAILS.filter((c) => canGoZeroProof(c)).length,
    errorCount: errors.length,
    warningCount: warnings.length,
    issues,
  };
  const auditOut =
    HEADER + `export const AUDIT = ${JSON.stringify(audit, null, 2)} as const;\n`;
  writeFileSync(join(OUT_DIR, 'cocktails-audit.gen.ts'), auditOut);

  console.log(`gen:meta — ${COCKTAILS.length} cocktails, ${INGREDIENTS.length} ingredients`);
  console.log(`  zero-proof reachable: ${audit.zeroProofReachable}/${COCKTAILS.length}`);
  if (warnings.length) console.log(`  warnings:\n    ${warnings.join('\n    ')}`);
  if (errors.length) {
    console.error(`  ERRORS:\n    ${errors.join('\n    ')}`);
    process.exit(1);
  }
  console.log('  ✓ integrity OK');
}

main();
