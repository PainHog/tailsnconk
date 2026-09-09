#!/usr/bin/env node
/**
 * check-secrets.mjs — fail the build if a server-only secret leaks into
 * anything the browser can download.
 *
 * WHAT IT SCANS
 *   - apps/mobile/src/**      (client-shippable source — everything here is
 *                              compiled into the static bundle)
 *   - apps/mobile/dist/**     (the built static export, if it exists yet)
 *
 * WHAT IT FLAGS
 *   1. Occurrences of KNOWN server-only secret env NAMES (the ones that must
 *      never reach the client — service-role key, Resend key, cron secret, …).
 *   2. Obvious secret-looking LITERALS: JWTs (eyJ…), OpenAI keys (sk-…),
 *      Resend keys (re_…).
 *   3. Any process.env / import.meta.env access to a var that is NOT prefixed
 *      EXPO_PUBLIC_ — the only prefix allowed to be inlined into the client.
 *
 * Exit 1 on ANY finding; exit 0 when clean. Robust to missing directories
 * (a fresh scaffold has no dist/ yet).
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Server-only env var names that must never appear in client code/output. */
const SECRET_ENV_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'DEPLOY_HOOK_AUTHORIZATION',
  'R2_SECRET_ACCESS_KEY',
  'FAL_KEY',
  'OPENAI_API_KEY',
];

/** The ONLY env prefix allowed to be referenced from client source. */
const ALLOWED_ENV_PREFIX = 'EXPO_PUBLIC_';

/**
 * Non-secret env names that legitimately appear in client bundles even though
 * they are not EXPO_PUBLIC_ prefixed (framework/runtime standard vars).
 */
const ENV_ALLOWLIST = new Set(['NODE_ENV', 'EXPO_OS', 'EXPO_BASE_URL']);

/** Secret-looking literal patterns (value shapes, not names). */
const LITERAL_PATTERNS = [
  { name: 'JWT (eyJ…) — likely a Supabase service_role/anon key', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/g },
  { name: 'OpenAI key (sk-…)', re: /\bsk-[A-Za-z0-9_-]{16,}\b/g },
  { name: 'Resend key (re_…)', re: /\bre_[A-Za-z0-9]{16,}\b/g },
];

/** Any env access; the captured name is checked against the prefix rule. */
const ENV_ACCESS_RE = /(?:process\.env|import\.meta\.env)\s*(?:\.\s*([A-Z0-9_]+)|\[\s*['"]([A-Z0-9_]+)['"]\s*\])/g;

/** Text file extensions worth scanning (skip images/fonts/binaries). */
const TEXT_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json',
  '.html', '.htm', '.css', '.txt', '.xml', '.map', '.md',
]);

/** Directories to scan (relative to repo root). */
const SCAN_DIRS = ['apps/mobile/src', 'apps/mobile/dist'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      out.push(...walk(full));
    } else if (e.isFile() && TEXT_EXTS.has(extname(e.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

/** Line number for a character offset (1-based). */
function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line++;
  return line;
}

function scanFile(file, findings) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  const rel = relative(ROOT, file);

  // 1) Known secret env NAMES anywhere in the file.
  for (const name of SECRET_ENV_NAMES) {
    const re = new RegExp(`\\b${name}\\b`, 'g');
    let m;
    while ((m = re.exec(text))) {
      findings.push({ file: rel, line: lineAt(text, m.index), rule: 'server-only secret name', detail: name });
    }
  }

  // 2) Secret-looking literals.
  for (const { name, re } of LITERAL_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      const snippet = m[0].slice(0, 12) + '…';
      findings.push({ file: rel, line: lineAt(text, m.index), rule: `secret literal — ${name}`, detail: snippet });
    }
  }

  // 3) Non-public env access.
  ENV_ACCESS_RE.lastIndex = 0;
  let e;
  while ((e = ENV_ACCESS_RE.exec(text))) {
    const varName = e[1] || e[2];
    if (!varName) continue;
    if (varName.startsWith(ALLOWED_ENV_PREFIX)) continue;
    if (ENV_ALLOWLIST.has(varName)) continue;
    findings.push({
      file: rel,
      line: lineAt(text, e.index),
      rule: 'non-public env access (only EXPO_PUBLIC_* allowed in client source)',
      detail: varName,
    });
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const findings = [];
const scanned = [];
for (const d of SCAN_DIRS) {
  const abs = join(ROOT, d);
  if (!existsSync(abs)) {
    console.log(`• skip (not present): ${d}`);
    continue;
  }
  const files = walk(abs);
  scanned.push(...files);
  for (const f of files) scanFile(f, findings);
}

console.log(`\ncheck-secrets: scanned ${scanned.length} file(s) across ${SCAN_DIRS.length} location(s).`);

if (findings.length === 0) {
  console.log('✓ No leaked secrets found.\n');
  process.exit(0);
}

console.error(`\n✗ ${findings.length} potential secret leak(s):\n`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  [${f.rule}]  ${f.detail}`);
}
console.error(
  '\nRemove the secret from client source/output. Server-only values belong in ' +
  'edge functions / CI secrets; only EXPO_PUBLIC_* vars may be inlined into the client.\n',
);
process.exit(1);
