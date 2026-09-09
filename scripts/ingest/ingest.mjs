/**
 * Cocktail ingestion pipeline.
 *
 * Sources (all permissively licensed / our own validated research):
 *   - IBA official cocktails      (rasmusab/iba-cocktails, MIT)
 *   - stevana/cocktails           (BSD-2)
 *   - researched.json             (our Opus+Exa agent research, original text)
 *   - curated.json                (our hand-validated overrides / descriptions)
 *
 * It normalizes every ingredient to a canonical slug, recomputes spirit base +
 * ABV band from the ingredients, merges by slug across sources (union of
 * provenance, cross-source ingredient agreement), runs a full audit, and writes
 * the generated dataset the app/build consumes:
 *   packages/core/src/data/{cocktails.gen.ts, ingredients.gen.ts, audit.gen.ts}
 *
 * Raw scraped sources are fetched at ingest time into .cache/ (gitignored) and
 * are NOT committed; the committed artifact is our normalized, factual data with
 * our own descriptions. Run: `npm run ingest`.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { load as yamlLoad } from 'js-yaml';

import {
  normalizeIngredient,
  normalizeAmountUnit,
  normalizeMethod,
  inferAbvBand,
  inferSpiritBase,
  slugify,
} from './normalize.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const CACHE = join(HERE, '.cache');
const OUT = join(REPO, 'packages', 'core', 'src', 'data');
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

const SOURCES = {
  iba: {
    url: 'https://raw.githubusercontent.com/rasmusab/iba-cocktails/master/iba-web/iba-cocktails-web.json',
    file: join(CACHE, 'iba-web.json'),
    attribution: 'https://github.com/rasmusab/iba-cocktails',
  },
  stevana: {
    url: 'https://raw.githubusercontent.com/stevana/cocktails/master/data/cocktails.yaml',
    file: join(CACHE, 'stevana-cocktails.yaml'),
    attribution: 'https://github.com/stevana/cocktails',
  },
};

async function ensure(src) {
  if (existsSync(src.file)) return readFileSync(src.file, 'utf8');
  const res = await fetch(src.url);
  if (!res.ok) throw new Error(`fetch ${src.url} → ${res.status}`);
  const text = await res.text();
  writeFileSync(src.file, text);
  return text;
}

// ---- Field inference helpers ----

const GLASS_BY_STYLE = (method, ings, base) => {
  const slugs = new Set(ings.map((i) => i.ingredientSlug));
  const tall = ['soda-water', 'tonic-water', 'ginger-beer', 'ginger-ale', 'cola', 'grapefruit-soda'];
  if (tall.some((s) => slugs.has(s))) return 'highball';
  if (base === 'none') return 'highball';
  if (slugs.has('champagne') || slugs.has('prosecco')) return 'flute';
  if (method === 'stir') return 'rocks';
  if (method === 'build') return 'rocks';
  return 'coupe';
};

function inferTags(method, base, abv) {
  const tags = ['classic'];
  if (base && base !== 'none' && base !== 'other') tags.push(base);
  if (abv === 'zero') tags.push('mocktail', 'zero-proof');
  if (abv === 'low') tags.push('low-abv');
  if (method === 'shake') tags.push('shaken');
  if (method === 'stir') tags.push('stirred');
  return [...new Set(tags)];
}

const SPIRIT_LABEL = {
  whiskey: 'whiskey', gin: 'gin', vodka: 'vodka', rum: 'rum', tequila: 'agave',
  brandy: 'brandy', aperitivo: 'aperitivo', other: '', none: 'zero-proof',
};

function synthDescription(name, method, base, ings) {
  const req = ings.filter((i) => !i.optional).slice(0, 3).map((i) => i.name.toLowerCase());
  const spirit = SPIRIT_LABEL[base] ?? '';
  const lead = base === 'none' ? 'A zero-proof' : `A ${method}${spirit ? ' ' + spirit : ''}`;
  return `${lead} cocktail made with ${req.join(', ')}.`;
}

// ---- Per-source normalization into a common shape ----

const registry = new Map(); // slug -> {name,type,contains}
function registerIngredient(ni) {
  if (!registry.has(ni.slug)) registry.set(ni.slug, { slug: ni.slug, name: ni.name, type: ni.type, contains: ni.contains });
}

/** Build a normalized cocktail from raw ingredient rows + hints. */
function buildNorm({ name, source, rawIngredients, methodHint, glassHint, tagsHint, description, abvHint, baseHint, sources }) {
  const ingredients = [];
  for (const row of rawIngredients) {
    const rawName = row.name;
    if (!rawName || !String(rawName).trim()) continue;
    const ni = normalizeIngredient(rawName, row.direction || '');
    registerIngredient(ni);
    const { amount, unit } = normalizeAmountUnit(row.amount, row.unit);
    const optional = row.optional != null ? Boolean(row.optional) : ni.isGarnish;
    ingredients.push({
      ingredientSlug: ni.slug, name: ni.name, type: ni.type, contains: ni.contains, base: ni.base,
      amount, unit, optional,
    });
  }
  const method = methodHint && ['stir', 'shake', 'build', 'muddle', 'blend'].includes(methodHint)
    ? methodHint : normalizeMethod(methodHint);
  let base = inferSpiritBase(ingredients);
  if (base === 'other' && baseHint && baseHint !== 'other') base = baseHint;
  let abv = inferAbvBand(ingredients);
  if (abv === 'zero' && ingredients.some((i) => i.contains.includes('alcohol'))) abv = abvHint || 'medium';
  const glass = glassHint || GLASS_BY_STYLE(method, ingredients, base);
  const kebab = (t) => String(t).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const tags = tagsHint && tagsHint.length
    ? [...new Set(tagsHint.map(kebab).filter(Boolean))]
    : inferTags(method, base, abv);
  return {
    slug: slugify(name), name: name.trim(), source, spiritBase: base, abvBand: abv, glass, method, tags,
    description: description || null,
    ingredients: ingredients.map(({ ingredientSlug, amount, unit, optional }) => ({ ingredientSlug, amount, unit, optional })),
    requiredSet: new Set(ingredients.filter((i) => !i.optional).map((i) => i.ingredientSlug)),
    sources: sources && sources.length ? sources : [],
  };
}

function parseIba(json) {
  return JSON.parse(json).map((c) =>
    buildNorm({
      name: c.name, source: 'iba',
      rawIngredients: (c.ingredients || []).map((i) => ({ name: i.ingredient, amount: i.quantity, unit: i.unit, direction: i.direction })),
      methodHint: c.method, sources: [SOURCES.iba.attribution],
    }),
  );
}

function parseStevana(text) {
  const docs = yamlLoad(text);
  return (docs || []).map((c) =>
    buildNorm({
      name: c.name, source: 'stevana',
      rawIngredients: (c.ingredients || []).map((i) => ({ name: i.ingredient, amount: i.amount, unit: i.unit })),
      methodHint: c.preparation, sources: [SOURCES.stevana.attribution],
    }),
  );
}

function parseResearch(arr) {
  return arr.map((c) =>
    buildNorm({
      name: c.name, source: 'research',
      rawIngredients: (c.ingredients || []).map((i) => ({ name: i.name, amount: i.amount, unit: i.unit, optional: i.optional })),
      methodHint: c.method, glassHint: c.glass, tagsHint: c.tags, description: c.description,
      abvHint: c.abv_band, baseHint: c.spirit_base, sources: c.sources || [],
    }),
  );
}

// ---- Merge + cross-validation ----

function jaccard(a, b) {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const PRIORITY = { curated: 4, research: 3, iba: 2, stevana: 1 };

function merge(all) {
  const bySlug = new Map();
  for (const c of all) {
    if (!bySlug.has(c.slug)) bySlug.set(c.slug, []);
    bySlug.get(c.slug).push(c);
  }
  const merged = [];
  const crossFlags = [];
  for (const [slug, group] of bySlug) {
    group.sort((x, y) => PRIORITY[y.source] - PRIORITY[x.source]);
    const base = group[0];
    // Cross-source agreement on required ingredients.
    let minAgree = 1;
    for (let i = 1; i < group.length; i++) {
      const a = jaccard(base.requiredSet, group[i].requiredSet);
      if (a < minAgree) minAgree = a;
    }
    if (group.length > 1 && minAgree < 0.5) {
      crossFlags.push(`${slug}: low cross-source agreement (${minAgree.toFixed(2)}) across ${group.map((g) => g.source).join('/')}`);
    }
    const sources = [...new Set(group.flatMap((g) => g.sources))];
    merged.push({
      slug,
      name: base.name,
      description: base.description || synthDescription(base.name, base.method, base.spiritBase, decorate(base.ingredients)),
      spiritBase: base.spiritBase,
      abvBand: base.abvBand,
      glass: base.glass,
      method: base.method,
      tags: base.tags,
      ingredients: base.ingredients,
      sources,
      _sourcesUsed: group.map((g) => g.source),
      _agreement: group.length > 1 ? Number(minAgree.toFixed(2)) : null,
    });
  }
  merged.sort((a, b) => a.name.localeCompare(b.name));
  return { merged, crossFlags };
}

// Re-attach ingredient names for synthDescription (registry lookup).
function decorate(ings) {
  return ings.map((i) => ({ ...i, name: registry.get(i.ingredientSlug)?.name ?? i.ingredientSlug }));
}

// ---- Audit ----

function audit(merged) {
  const issues = [];
  const usage = new Map();
  for (const c of merged) {
    const req = c.ingredients.filter((i) => !i.optional);
    if (req.length === 0) issues.push(`${c.slug}: no required ingredients`);
    if (c.ingredients.length > 14) issues.push(`${c.slug}: too many ingredients (${c.ingredients.length})`);
    for (const i of c.ingredients) usage.set(i.ingredientSlug, (usage.get(i.ingredientSlug) || 0) + 1);
  }
  const singletons = [...usage.entries()].filter(([, n]) => n === 1).map(([s]) => s);
  return { issues, singletons, usage };
}

// ---- Emit ----

const HEADER = `/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 * Produced by \`npm run ingest\` (scripts/ingest/ingest.mjs).
 * Regenerate after changing sources; then run \`npm run gen:meta\`.
 */\n\n`;

function emit(merged, auditData) {
  const cocktails = merged.map((c) => ({
    slug: c.slug, name: c.name, description: c.description, spiritBase: c.spiritBase,
    abvBand: c.abvBand, glass: c.glass, method: c.method, tags: c.tags,
    ingredients: c.ingredients, sources: c.sources,
  }));
  writeFileSync(
    join(OUT, 'cocktails.gen.ts'),
    HEADER + `import type { Cocktail } from '../types';\n\nexport const COCKTAILS: Cocktail[] = ${JSON.stringify(cocktails, null, 2)};\n`,
  );

  const ingredients = [...registry.values()]
    .filter((i) => auditData.usage.has(i.slug))
    .map((i) => ({ slug: i.slug, name: i.name, type: i.type, ...(i.contains.length ? { contains: i.contains } : {}) }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
  writeFileSync(
    join(OUT, 'ingredients.gen.ts'),
    HEADER + `import type { Ingredient } from '../types';\n\nexport const INGREDIENTS: Ingredient[] = ${JSON.stringify(ingredients, null, 2)};\n`,
  );

  const report = {
    totalCocktails: cocktails.length,
    totalIngredients: ingredients.length,
    bySource: countBySource(merged),
    crossValidated: merged.filter((c) => c._agreement != null).length,
    lowAgreement: merged.filter((c) => c._agreement != null && c._agreement < 0.5).map((c) => c.slug),
    integrityIssues: auditData.issues,
    singletonIngredients: auditData.singletons,
  };
  writeFileSync(join(OUT, 'audit.gen.ts'), HEADER + `export const INGEST_AUDIT = ${JSON.stringify(report, null, 2)} as const;\n`);
  return report;
}

function countBySource(merged) {
  const out = {};
  for (const c of merged) for (const s of c._sourcesUsed) out[s] = (out[s] || 0) + 1;
  return out;
}

// ---- Main ----

async function main() {
  const ibaRaw = await ensure(SOURCES.iba);
  const stevRaw = await ensure(SOURCES.stevana);

  const researchedPath = join(HERE, 'researched.json');
  const curatedPath = join(HERE, 'curated.json');
  const researched = existsSync(researchedPath) ? JSON.parse(readFileSync(researchedPath, 'utf8')) : [];
  const curatedArr = existsSync(curatedPath) ? JSON.parse(readFileSync(curatedPath, 'utf8')) : [];

  // curated is a full source with top priority (its recipes + descriptions win).
  const parseCurated = (arr) => parseResearch(arr).map((c) => ({ ...c, source: 'curated' }));
  const all = [...parseCurated(curatedArr), ...parseResearch(researched), ...parseIba(ibaRaw), ...parseStevana(stevRaw)];
  const { merged, crossFlags } = merge(all);
  const auditData = audit(merged);
  const report = emit(merged, auditData);

  console.log(`ingest: ${report.totalCocktails} cocktails, ${report.totalIngredients} ingredients`);
  console.log(`  by source (merged uses): ${JSON.stringify(report.bySource)}`);
  console.log(`  cross-validated (>=2 sources): ${report.crossValidated}; low agreement: ${report.lowAgreement.length}`);
  if (report.lowAgreement.length) console.log(`    ${report.lowAgreement.join(', ')}`);
  if (auditData.issues.length) console.log(`  INTEGRITY ISSUES:\n    ${auditData.issues.join('\n    ')}`);
  console.log(`  singleton ingredients (used once): ${auditData.singletons.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
