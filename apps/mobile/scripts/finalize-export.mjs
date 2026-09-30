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
 *   3. Finalize dist/_headers CSP: substitute the real Supabase origin from
 *      EXPO_PUBLIC_SUPABASE_URL into connect-src (replacing the YOUR-PROJECT
 *      placeholder), and add AdSense hosts when EXPO_PUBLIC_AD_PROVIDER=adsense.
 *      Fails loudly if the placeholder would ship while Supabase is configured.
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

const SUPABASE_PLACEHOLDER = /https:\/\/YOUR-PROJECT\.supabase\.co/g;
const WSS_PLACEHOLDER = /wss:\/\/YOUR-PROJECT\.supabase\.co/g;

function finalizeHeaders() {
  const file = join(DIST, '_headers');
  if (!existsSync(file)) {
    console.log('finalize-export: no dist/_headers — skipping CSP finalize.');
    return;
  }
  const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const adsense = (process.env.EXPO_PUBLIC_AD_PROVIDER || '') === 'adsense';

  // Edit ONLY the Content-Security-Policy header line — never the surrounding
  // comment block (which mentions the directive names) or other headers.
  const lines = readFileSync(file, 'utf8').split('\n');
  let placeholderInCsp = false;
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*Content-Security-Policy:/i.test(lines[i])) continue;
    let csp = lines[i];

    if (supabaseUrl) {
      const host = supabaseUrl.replace(/^https?:\/\//, '');
      csp = csp.replace(SUPABASE_PLACEHOLDER, `https://${host}`).replace(WSS_PLACEHOLDER, `wss://${host}`);
    }

    if (adsense) {
      const add = {
        'script-src': 'https://pagead2.googlesyndication.com https://partner.googleadservices.com',
        'connect-src': 'https://pagead2.googlesyndication.com',
        'frame-src': 'https://googleads.g.doubleclick.net https://*.google.com',
      };
      for (const [dir, hosts] of Object.entries(add)) {
        // `[^;\n]` stays within this single directive; insert before its ';'.
        const re = new RegExp(`(\\b${dir}\\s+[^;\\n]*?)(;)`);
        csp = csp.replace(re, (m, body, semi) => (body.includes('pagead2') || body.includes('doubleclick') ? m : `${body} ${hosts}${semi}`));
      }
    }

    if (csp.includes('YOUR-PROJECT.supabase.co')) placeholderInCsp = true;
    lines[i] = csp;
  }
  const text = lines.join('\n');
  writeFileSync(file, text);

  // Guard: never ship the placeholder in a CSP directive on a Supabase build
  // (the surrounding comment may still mention it — that's fine, it's not sent).
  if (supabaseUrl && placeholderInCsp) {
    console.error('finalize-export: CSP still contains the Supabase placeholder — check EXPO_PUBLIC_SUPABASE_URL.');
    process.exitCode = 1;
    return;
  }
  console.log(`finalize-export: CSP finalized${supabaseUrl ? ' (Supabase origin substituted)' : ' (no Supabase env; placeholder left for manual edit)'}.`);
}

function main() {
  if (!existsSync(DIST) || !statSync(DIST).isDirectory()) {
    console.log('finalize-export: no dist/ — nothing to finalize.');
    return;
  }
  ensure404();
  stripSourceMaps();
  finalizeHeaders();
}

try {
  main();
} catch (err) {
  console.error(`finalize-export: ${err.message} (continuing).`);
}
// Exit non-zero only if a guard (e.g. an un-substituted CSP placeholder on a
// Supabase-configured build) set process.exitCode; otherwise never break export.
process.exit(process.exitCode || 0);
