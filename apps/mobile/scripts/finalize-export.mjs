#!/usr/bin/env node
/**
 * finalize-export.mjs — last post-export housekeeping:
 *
 *   1. Ensure dist/404.html exists. Cloudflare Pages serves 404.html for
 *      unknown routes; Expo Router's not-found route exports to +not-found.html
 *      (a few historical names are tried). If none is found, a minimal branded
 *      404 is written.
 *   2. Strip source maps (*.map) and their sourceMappingURL comments from the
 *      shipped bundle so client JS/CSS don't ship maps.
 *
 * Safe no-op when dist/ is missing. NEVER breaks the export.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, copyFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(HERE, '..', 'dist');

/** Candidate files Expo Router may emit for the not-found route. */
const NOT_FOUND_CANDIDATES = ['+not-found.html', '_not-found.html', 'not-found.html', '404.html'];

const MINIMAL_404 = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Page not found</title>
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center;
           font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
           background:#12100e; color:#f6f1e7; text-align:center; padding:2rem; }
    a { color:#e0b15e; }
  </style>
</head>
<body>
  <main>
    <h1>404 — nothing on the shelf here</h1>
    <p>That page doesn't exist. <a href="/">Back to your bar</a>.</p>
  </main>
</body>
</html>
`;

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile()) out.push(full);
  }
  return out;
}

function ensure404() {
  const target = join(DIST, '404.html');
  if (existsSync(target)) {
    console.log('finalize-export: dist/404.html already present.');
    return;
  }
  for (const name of NOT_FOUND_CANDIDATES) {
    const src = join(DIST, name);
    if (name !== '404.html' && existsSync(src)) {
      copyFileSync(src, target);
      console.log(`finalize-export: copied ${name} -> 404.html`);
      return;
    }
  }
  writeFileSync(target, MINIMAL_404);
  console.log('finalize-export: wrote a minimal dist/404.html');
}

function stripSourceMaps() {
  const files = walk(DIST);
  let removed = 0;
  let cleaned = 0;
  for (const f of files) {
    if (f.endsWith('.map')) {
      rmSync(f, { force: true });
      removed++;
      continue;
    }
    if (/\.(js|mjs|css)$/.test(f)) {
      const text = readFileSync(f, 'utf8');
      const next = text.replace(/^\s*\/[/*]#\s*sourceMappingURL=.*$/gm, '').replace(/\n{3,}$/,'\n');
      if (next !== text) {
        writeFileSync(f, next);
        cleaned++;
      }
    }
  }
  console.log(`finalize-export: removed ${removed} source map(s), cleaned ${cleaned} sourceMappingURL comment(s).`);
}

function main() {
  if (!existsSync(DIST) || !statSync(DIST).isDirectory()) {
    console.log('finalize-export: no dist/ — nothing to finalize.');
    return;
  }
  ensure404();
  stripSourceMaps();
}

try {
  main();
} catch (err) {
  console.error(`finalize-export: ${err.message} (continuing).`);
}
process.exit(0);
