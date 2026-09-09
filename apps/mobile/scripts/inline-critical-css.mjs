#!/usr/bin/env node
/**
 * inline-critical-css.mjs — best-effort post-export pass that inlines a small
 * critical-CSS block into the <head> of every exported HTML page, so first
 * paint doesn't wait on the external stylesheet.
 *
 * SOURCE : apps/mobile/critical.css  (author-maintained; optional)
 * TARGET : every *.html page under apps/mobile/dist/
 *
 * No-op (exit 0) when critical.css or dist/ is absent. Idempotent: pages that
 * already carry the inlined block are left untouched. NEVER breaks the export.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const APP = join(HERE, '..');
const DIST = join(APP, 'dist');
const CRITICAL = join(APP, 'critical.css');

const MARKER = 'data-critical="1"';

function walkHtml(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkHtml(full));
    else if (e.isFile() && e.name.toLowerCase().endsWith('.html')) out.push(full);
  }
  return out;
}

function main() {
  if (!existsSync(CRITICAL)) {
    console.log('inline-critical-css: no apps/mobile/critical.css — nothing to inline.');
    return;
  }
  if (!existsSync(DIST) || !statSync(DIST).isDirectory()) {
    console.log('inline-critical-css: no dist/ — nothing to inline.');
    return;
  }

  const css = readFileSync(CRITICAL, 'utf8').trim();
  if (!css) {
    console.log('inline-critical-css: critical.css is empty — skipping.');
    return;
  }
  // Guard against breaking out of the <style> element.
  const safeCss = css.replace(/<\/style>/gi, '<\\/style>');
  const block = `<style ${MARKER}>${safeCss}</style>`;

  const files = walkHtml(DIST);
  let changed = 0;
  for (const file of files) {
    let html = readFileSync(file, 'utf8');
    if (html.includes(MARKER)) continue; // already inlined — idempotent
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, `${block}</head>`);
    } else if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}${block}`);
    } else {
      continue; // no head to inject into
    }
    writeFileSync(file, html);
    changed++;
  }
  console.log(`inline-critical-css: inlined critical CSS into ${changed}/${files.length} page(s).`);
}

try {
  main();
} catch (err) {
  console.error(`inline-critical-css: ${err.message} (continuing).`);
}
process.exit(0);
