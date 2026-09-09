/**
 * inject-jsonld — post-export step that injects schema.org JSON-LD into each
 * built page's <head>.
 *
 * Why a build step: expo-router/head drops <script> children and
 * react-native-web strips raw DOM <script> from the component tree, so JSON-LD
 * can't be emitted from React. Here we rebuild the exact same structured data
 * from @tailsnconk/core (the single source of truth) and splice it into the
 * already-exported HTML — keeping it in <head> where crawlers expect it, and
 * keeping the number shown on-page in sync with the JSON-LD once ratings are baked.
 *
 * Idempotent: skips a file that already contains an ld+json block. Safe no-op if
 * dist/ is missing. Run with tsx (imports the TS core).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  COCKTAILS,
  cocktailJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  indexableCollections,
  ingredientName,
  SPIRIT_LABELS,
} from '@tailsnconk/core';

const DIST = join(process.cwd(), 'dist');
const SITE = process.env.EXPO_PUBLIC_SITE_URL || 'https://tailsnconk.com';

if (!existsSync(DIST)) {
  console.log('inject-jsonld: no dist/ — skipping.');
  process.exit(0);
}

let injected = 0;
let skipped = 0;

/** Splice one or more JSON-LD blocks into a page's <head>. */
function inject(relPath, blocks) {
  const file = join(DIST, relPath);
  if (!existsSync(file)) return;
  let html = readFileSync(file, 'utf8');
  if (html.includes('application/ld+json')) {
    skipped++;
    return;
  }
  const tags = blocks
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
    .join('');
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${tags}</head>`);
  } else {
    html = tags + html;
  }
  writeFileSync(file, html);
  injected++;
}

// Homepage → Organization
inject('index.html', [organizationJsonLd(SITE)]);

// Each cocktail → Recipe + BreadcrumbList + FAQPage
const indexableSlugs = new Set(indexableCollections(COCKTAILS).map((h) => h.slug));
for (const c of COCKTAILS) {
  const crumbs = [{ name: 'Catalog', path: '/catalog' }];
  if (indexableSlugs.has(`spirit-${c.spiritBase}`)) {
    crumbs.push({ name: `${SPIRIT_LABELS[c.spiritBase]} Cocktails`, path: `/collection/spirit-${c.spiritBase}` });
  }
  crumbs.push({ name: c.name, path: `/cocktail/${c.slug}` });

  const requiredNames = c.ingredients.filter((i) => !i.optional).map((i) => ingredientName(i.ingredientSlug));
  inject(`cocktail/${c.slug}.html`, [
    cocktailJsonLd(c, SITE),
    breadcrumbJsonLd(SITE, crumbs),
    faqJsonLd([
      { question: `What's in a ${c.name}?`, answer: `A ${c.name} is made with ${requiredNames.join(', ')}.` },
      {
        question: `Can I make a zero-proof ${c.name}?`,
        answer: 'Yes — swap the alcoholic components for non-alcoholic equivalents using the "Make it zero-proof" toggle on the cocktail page.',
      },
    ]),
  ]);
}

// Each indexable collection hub → BreadcrumbList
for (const h of indexableCollections(COCKTAILS)) {
  inject(`collection/${h.slug}.html`, [
    breadcrumbJsonLd(SITE, [
      { name: 'Collections', path: '/collections' },
      { name: h.title, path: `/collection/${h.slug}` },
    ]),
  ]);
}

console.log(`inject-jsonld: injected ${injected} page(s), skipped ${skipped} already-tagged.`);
