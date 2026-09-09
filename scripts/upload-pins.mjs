#!/usr/bin/env node
/**
 * upload-pins.mjs — upload newly composed pin PNGs to Cloudflare R2 (S3 API).
 *
 * ENV (S3-style, as R2 exposes):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET
 *   PIN_PUBLIC_BASE   (optional) public base URL, only used for log output.
 *
 * HARD GATES (env-configurable):
 *   UPLOAD_MAX_OBJECTS default 25       — max objects uploaded per run.
 *   UPLOAD_MAX_BYTES   default 52428800 — 50 MiB per run.
 *
 * IDEMPOTENT: already-uploaded keys are tracked in .pins-cache/uploaded.json
 * (under scripts/, gitignored) and skipped. This script NEVER deletes anything
 * in the bucket.
 *
 * The @aws-sdk/client-s3 SDK is imported LAZILY. If it — or the credentials —
 * are missing, this prints instructions and exits 0 (safe no-op).
 */

import { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PINS_DIR = join(ROOT, 'apps/mobile/public/pins');
const CACHE_DIR = join(ROOT, 'scripts/.pins-cache');
const CACHE_FILE = join(CACHE_DIR, 'uploaded.json');

const env = process.env;
const num = (v, d) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
const UPLOAD_MAX_OBJECTS = num(env.UPLOAD_MAX_OBJECTS, 25);
const UPLOAD_MAX_BYTES = num(env.UPLOAD_MAX_BYTES, 50 * 1024 * 1024);
const KEY_PREFIX = (env.R2_KEY_PREFIX || 'pins').replace(/^\/+|\/+$/g, '');
const PIN_PUBLIC_BASE = (env.PIN_PUBLIC_BASE || '').replace(/\/$/, '');

// ---------------------------------------------------------------------------
// Preconditions
// ---------------------------------------------------------------------------
const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET } = env;
const missing = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_BUCKET']
  .filter((k) => !env[k]);

if (missing.length) {
  console.log(
    `\nupload-pins: missing R2 credentials (${missing.join(', ')}); skipping upload.\n` +
    'Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT and R2_BUCKET to enable.\n' +
    '(exiting 0 — safe no-op)\n',
  );
  process.exit(0);
}

if (!existsSync(PINS_DIR)) {
  console.log(`upload-pins: no pins dir (${PINS_DIR}); nothing to upload.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Lazy SDK
// ---------------------------------------------------------------------------
let S3;
try {
  S3 = await import('@aws-sdk/client-s3');
} catch {
  console.log(
    '\nupload-pins: `@aws-sdk/client-s3` is not installed — skipping upload.\n' +
    'To enable R2 uploads:  npm i -D @aws-sdk/client-s3\n' +
    '(exiting 0 — safe no-op)\n',
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------
function loadCache() {
  try {
    return new Set(JSON.parse(readFileSync(CACHE_FILE, 'utf8')).keys ?? []);
  } catch {
    return new Set();
  }
}
function saveCache(set) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify({ keys: [...set].sort() }, null, 2) + '\n');
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------
const uploaded = loadCache();

const files = readdirSync(PINS_DIR)
  .filter((f) => f.endsWith('.pin.png'))
  .sort();

const { S3Client, PutObjectCommand } = S3;
const client = new S3Client({
  region: env.R2_REGION || 'auto',
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

let count = 0;
let bytes = 0;
let skipped = 0;

for (const f of files) {
  const key = `${KEY_PREFIX}/${f}`;
  if (uploaded.has(key)) {
    skipped++;
    continue;
  }
  if (count >= UPLOAD_MAX_OBJECTS) {
    console.log(`  · reached object cap (${UPLOAD_MAX_OBJECTS}); stopping.`);
    break;
  }
  const path = join(PINS_DIR, f);
  const size = statSync(path).size;
  if (bytes + size > UPLOAD_MAX_BYTES) {
    console.log(`  · byte budget reached (${bytes}/${UPLOAD_MAX_BYTES}); stopping before ${f}.`);
    break;
  }

  try {
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: readFileSync(path),
      ContentType: 'image/png',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
  } catch (err) {
    console.error(`  ✗ ${key}: upload failed — ${err.message}`);
    continue;
  }

  uploaded.add(key);
  count++;
  bytes += size;
  const url = PIN_PUBLIC_BASE ? `${PIN_PUBLIC_BASE}/${key}` : key;
  console.log(`  ✓ ${key}  (${(size / 1024).toFixed(0)} KiB)  ${url}`);
  // Persist after each success so an interrupted run is still idempotent.
  saveCache(uploaded);
}

saveCache(uploaded);
console.log(`\nupload-pins: uploaded ${count} new object(s), ${(bytes / 1024).toFixed(0)} KiB; ` +
  `${skipped} already-uploaded skipped; ${uploaded.size} total tracked.\n`);
process.exit(0);
