#!/usr/bin/env node
/**
 * seo-audit.mjs — SEO regression check. Two modes:
 *
 *   A) EXPORT AUDIT (apps/mobile/dist/ exists) — walk the built *.html and
 *      verify, per page:
 *        • a non-empty <title>, and titles are unique across indexable pages
 *        • a <link rel="canonical">
 *        • a <meta name="robots"> is present
 *      plus, across the export:
 *        • every <loc>/<url> in dist/sitemap.xml resolves to a real file
 *        • admin routes (/moderate) are noindex
 *
 *   B) DATA AUDIT (no dist/ yet — fresh scaffold) — derive the same guarantees
 *      from @tailsnconk/core:
 *        • cocktail slugs are unique
 *        • every indexable collection has >= MIN_COCKTAILS members
 *        • the derivable page titles contain no duplicates
 *
 * Exit non-zero on real problems; exit 0 when clean.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'apps/mobile/dist');

const problems = [];
const notes = [];
const fail = (msg) => problems.push(msg);
const note = (msg) => notes.push(msg);

// ---------------------------------------------------------------------------
// Small HTML helpers (regex — good enough for our own generated markup)
// ---------------------------------------------------------------------------

function titleOf(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}
function hasCanonical(html) {
  return /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html);
}
function robotsOf(html) {
  const m = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i);
  if (!m) return null;
  const c = m[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1].toLowerCase() : '';
}
function isNoindex(html) {
  const r = robotsOf(html);
  return r != null && r.includes('noindex');
}

function walkHtml(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkHtml(full));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.html')) out.push(full);
  }
  return out;
}

/** Map a route path from a sitemap <loc> to a candidate file on disk. */
function fileForRoute(pathname) {
  const clean = pathname.replace(/^\/+/, '').replace(/\/+$/, '');
  const candidates = clean === ''
    ? ['index.html']
    : [`${clean}.html`, `${clean}/index.html`];
  return candidates.map((c) => join(DIST, c));
}

// ---------------------------------------------------------------------------
// Mode A — export audit
// ---------------------------------------------------------------------------

function auditExport() {
  console.log('seo-audit: EXPORT mode (apps/mobile/dist present).\n');
  const files = walkHtml(DIST);
  if (files.length === 0) {
    fail('dist/ exists but contains no *.html files.');
    return;
  }

  const titleToPages = new Map(); // title -> [route] for indexable pages only

  for (const file of files) {
    const rel = relative(DIST, file);
    // Expo Router's internal debug page (_sitemap) is not a content page and is
    // excluded from the real sitemap; don't hold it to page-level SEO rules.
    if (/(^|\/)_sitemap(\/|$|\.html)/i.test(rel)) continue;
    const route = '/' + rel.replace(/index\.html$/i, '').replace(/\.html$/i, '').replace(/\/$/, '');
    const html = readFileSync(file, 'utf8');

    const title = titleOf(html);
    if (!title) fail(`${rel}: missing or empty <title>.`);
    if (!hasCanonical(html)) fail(`${rel}: missing <link rel="canonical">.`);
    if (robotsOf(html) == null) fail(`${rel}: missing <meta name="robots">.`);

    // Admin pages must be noindex.
    if (/(^|\/)moderate(\/|$|\.html)/i.test(rel) && !isNoindex(html)) {
      fail(`${rel}: admin route (/moderate) is NOT noindex.`);
    }

    // Track titles of indexable pages for the uniqueness check.
    if (title && !isNoindex(html)) {
      if (!titleToPages.has(title)) titleToPages.set(title, []);
      titleToPages.get(title).push(route || '/');
    }
  }

  for (const [title, pages] of titleToPages) {
    if (pages.length > 1) {
      fail(`Duplicate <title> across indexable pages: "${title}" -> ${pages.join(', ')}`);
    }
  }

  // Sitemap: every URL must resolve to a file.
  const sitemap = join(DIST, 'sitemap.xml');
  if (!existsSync(sitemap)) {
    fail('dist/sitemap.xml is missing.');
  } else {
    const xml = readFileSync(sitemap, 'utf8');
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
    if (locs.length === 0) fail('sitemap.xml contains no <loc> entries.');
    let pathname;
    for (const loc of locs) {
      try {
        pathname = new URL(loc).pathname;
      } catch {
        pathname = loc; // already a path
      }
      const candidates = fileForRoute(pathname);
      const found = candidates.some((c) => existsSync(c) && statSync(c).isFile());
      if (!found) {
        fail(`sitemap URL does not resolve to a file: ${loc} (looked for ${candidates.map((c) => relative(DIST, c)).join(' | ')})`);
      }
      // A sitemap should never list a noindex admin route.
      if (/(^|\/)moderate(\/|$)/i.test(pathname)) {
        fail(`sitemap lists an admin/noindex route: ${loc}`);
      }
    }
    note(`sitemap.xml: ${locs.length} URL(s) checked.`);
  }

  note(`${files.length} HTML page(s) audited.`);
}

// ---------------------------------------------------------------------------
// Mode B — data audit (no export yet)
// ---------------------------------------------------------------------------

async function auditData() {
  console.log('seo-audit: DATA mode (no dist/ — auditing @tailsnconk/core).\n');
  let core;
  try {
    const { tsImport } = await import('tsx/esm/api');
    core = await tsImport('@tailsnconk/core', import.meta.url);
  } catch (err) {
    fail(`could not load @tailsnconk/core: ${err.message}`);
    return;
  }

  const { COCKTAILS, allCocktailSlugs, indexableCollections, MIN_COCKTAILS, SITE_NAME } = core;

  // 1) Unique cocktail slugs.
  const slugs = allCocktailSlugs();
  const dupSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupSlugs.length) fail(`duplicate cocktail slug(s): ${[...new Set(dupSlugs)].join(', ')}`);

  // 2) Every indexable collection has >= MIN_COCKTAILS members + unique slugs.
  const cols = indexableCollections(COCKTAILS);
  for (const c of cols) {
    if (c.memberSlugs.length < MIN_COCKTAILS) {
      fail(`collection "${c.slug}" is indexable but has ${c.memberSlugs.length} < MIN_COCKTAILS(${MIN_COCKTAILS}).`);
    }
  }
  const colSlugs = cols.map((c) => c.slug);
  const dupCol = colSlugs.filter((s, i) => colSlugs.indexOf(s) !== i);
  if (dupCol.length) fail(`duplicate collection slug(s): ${[...new Set(dupCol)].join(', ')}`);

  // 3) Derivable titles must be unique across all indexable pages.
  //    (Static pages + one page per cocktail + one page per indexable hub.)
  const titles = new Map();
  const add = (title, where) => {
    const t = `${title} · ${SITE_NAME}`;
    if (!titles.has(t)) titles.set(t, []);
    titles.get(t).push(where);
  };
  for (const label of ['Home', 'Spin', 'Catalog', 'Collections', 'About', 'Privacy', 'Terms']) add(label, `static:${label}`);
  for (const c of COCKTAILS) add(c.name, `cocktail:${c.slug}`);
  for (const c of cols) add(c.title, `collection:${c.slug}`);
  for (const [t, where] of titles) {
    if (where.length > 1) fail(`duplicate derivable title "${t}" from ${where.join(', ')}`);
  }

  note(`${slugs.length} cocktail(s), ${cols.length} indexable collection(s), ${titles.size} unique title(s).`);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

if (existsSync(DIST) && statSync(DIST).isDirectory()) {
  auditExport();
} else {
  await auditData();
}

for (const n of notes) console.log(`  • ${n}`);
if (problems.length) {
  console.error(`\n✗ seo-audit found ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}
console.log('\n✓ seo-audit passed.\n');
process.exit(0);
