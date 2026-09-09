#!/usr/bin/env node
/**
 * make-pins.mjs — compose vertical Pinterest pins (1000x1500) for cocktails
 * that have an approved source image, and (re)build a Pinterest bulk-upload
 * feed CSV.
 *
 * INPUT  : apps/mobile/public/images/<slug>.jpg   (approved source image)
 * OUTPUT : apps/mobile/public/pins/<slug>.pin.png (composed pin)
 *          apps/mobile/public/pins-feed*.csv       (bulk-upload feed, chunked)
 *
 * FREE-TIER GATES (all env-configurable, all HARD):
 *   PIN_PER_DAY   default 5    — max NEW pins composed per run (a daily job).
 *   PIN_MAX_OBJECTS default 50 — absolute per-run object cap (belt & braces).
 *   PIN_MAX_BYTES default 26214400 (25 MiB) — stop once this run has written
 *                                that many output bytes.
 *   PIN_CSV_MAX_ROWS default 1000 — per-file row cap; the feed is chunked.
 *
 * OTHER TUNING (env):
 *   PIN_START_DATE  ISO date anchor for the drip schedule (optional). When set,
 *                   total pins allowed so far = (whole days since start + 1) *
 *                   PIN_PER_DAY, so the catalog is released gradually.
 *   PIN_FILE_PREFIX feed filename prefix (default "pins-feed").
 *   PIN_SKIP        comma/space separated slugs to never pin.
 *   PIN_PUBLIC_BASE public base URL where pins are hosted (R2/CDN), used for
 *                   the feed's image_url column. Falls back to the site URL.
 *   EXPO_PUBLIC_SITE_URL  site origin for the pin link column.
 *
 * IDEMPOTENT: a pin whose <slug>.pin.png already exists is skipped. The feed
 * CSV is regenerated from whatever pins exist on disk, so re-running never
 * duplicates rows.
 *
 * sharp is imported LAZILY. If it is not installed, this prints how to add it
 * and exits 0 (never breaks a pipeline that has not opted into pin rendering).
 */

import { readdirSync, existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const IMAGES_DIR = join(ROOT, 'apps/mobile/public/images');
const PINS_DIR = join(ROOT, 'apps/mobile/public/pins');
const PUBLIC_DIR = join(ROOT, 'apps/mobile/public');

// ---- env / tuning ----------------------------------------------------------
const env = process.env;
const num = (v, d) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);

const PIN_PER_DAY = num(env.PIN_PER_DAY, 5);
const PIN_MAX_OBJECTS = num(env.PIN_MAX_OBJECTS, 50);
const PIN_MAX_BYTES = num(env.PIN_MAX_BYTES, 25 * 1024 * 1024);
const PIN_CSV_MAX_ROWS = num(env.PIN_CSV_MAX_ROWS, 1000);
const PIN_FILE_PREFIX = env.PIN_FILE_PREFIX || 'pins-feed';
const PIN_SKIP = new Set((env.PIN_SKIP || '').split(/[\s,]+/).filter(Boolean));
const SITE_URL = (env.EXPO_PUBLIC_SITE_URL || 'https://tailsnconk.com').replace(/\/$/, '');
const PIN_PUBLIC_BASE = (env.PIN_PUBLIC_BASE || SITE_URL).replace(/\/$/, '');

const W = 1000;
const H = 1500;
const BAND_H = 430; // caption band height at the bottom
const BG = '#12100E';
const BAND_BG = '#1c1712';
const ACCENT = '#e0b15e';
const TEXT = '#f6f1e7';

// ---------------------------------------------------------------------------
// Lazy sharp loader
// ---------------------------------------------------------------------------
async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

async function loadCore() {
  const { tsImport } = await import('tsx/esm/api');
  return tsImport('@tailsnconk/core', import.meta.url);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function xmlEscape(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function csvEscape(s) {
  const v = String(s ?? '');
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Naive word-wrap to a max chars-per-line, capped at maxLines. */
function wrap(text, perLine, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > perLine && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = (cur ? cur + ' ' : '') + w;
    }
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/, '…');
  }
  return lines;
}

/** Build the caption-band SVG overlay (brand strip + cocktail name). */
function bandSvg(brand, name, spiritLabel) {
  const nameLines = wrap(name, 18, 3);
  const fontSize = nameLines.length >= 3 ? 74 : nameLines.length === 2 ? 88 : 104;
  const lineH = fontSize + 8;
  const blockH = nameLines.length * lineH;
  const startY = (BAND_H - blockH) / 2 + fontSize - 6;
  const nameTspans = nameLines
    .map((l, i) => `<tspan x="60" y="${Math.round(startY + i * lineH)}">${xmlEscape(l)}</tspan>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${BAND_H}">
  <rect width="${W}" height="${BAND_H}" fill="${BAND_BG}"/>
  <rect width="${W}" height="8" fill="${ACCENT}"/>
  <text x="60" y="70" font-family="Georgia, 'Times New Roman', serif" font-size="30"
        letter-spacing="4" fill="${ACCENT}">${xmlEscape(brand.toUpperCase())}</text>
  <text font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="${fontSize}" fill="${TEXT}">${nameTspans}</text>
  <text x="60" y="${BAND_H - 40}" font-family="Georgia, 'Times New Roman', serif"
        font-size="30" fill="${ACCENT}">${xmlEscape(spiritLabel || 'Cocktail')}</text>
</svg>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const sharp = await loadSharp();
  if (!sharp) {
    console.log(
      '\nmake-pins: `sharp` is not installed — skipping pin composition.\n' +
      'To enable pin rendering:  npm i -D sharp\n' +
      '(exiting 0 so this is a safe no-op in pipelines that have not opted in)\n',
    );
    process.exit(0);
  }

  let core;
  try {
    core = await loadCore();
  } catch (err) {
    console.log(`make-pins: could not load @tailsnconk/core (${err.message}); nothing to do.`);
    process.exit(0);
  }
  const { COCKTAILS, SPIRIT_LABELS, SITE_NAME } = core;

  if (!existsSync(IMAGES_DIR)) {
    console.log(`make-pins: no source images dir (${IMAGES_DIR}); nothing to compose.`);
    // Still (re)write an (empty) feed so downstream steps have a file.
    writeFeed([]);
    process.exit(0);
  }
  mkdirSync(PINS_DIR, { recursive: true });

  // Candidates: cocktails with an approved <slug>.jpg, not skipped, not done.
  const candidates = COCKTAILS
    .filter((c) => !PIN_SKIP.has(c.slug))
    .filter((c) => existsSync(join(IMAGES_DIR, `${c.slug}.jpg`)))
    .filter((c) => !existsSync(join(PINS_DIR, `${c.slug}.pin.png`)));

  // Drip schedule: cap total pins that may exist by now.
  let remainingByDrip = Infinity;
  if (env.PIN_START_DATE) {
    const start = new Date(env.PIN_START_DATE);
    if (!Number.isNaN(start.getTime())) {
      const days = Math.floor((Date.now() - start.getTime()) / 86400000) + 1;
      const allowedTotal = Math.max(0, days) * PIN_PER_DAY;
      const alreadyDone = existsSync(PINS_DIR)
        ? readdirSync(PINS_DIR).filter((f) => f.endsWith('.pin.png')).length
        : 0;
      remainingByDrip = Math.max(0, allowedTotal - alreadyDone);
    }
  }

  const perRunCap = Math.min(PIN_PER_DAY, PIN_MAX_OBJECTS, remainingByDrip);

  console.log(`make-pins: ${candidates.length} candidate(s); per-run cap ${Number.isFinite(perRunCap) ? perRunCap : '∞'} ` +
    `(PIN_PER_DAY=${PIN_PER_DAY}, MAX_OBJECTS=${PIN_MAX_OBJECTS}, MAX_BYTES=${PIN_MAX_BYTES}).`);

  let made = 0;
  let bytes = 0;
  for (const c of candidates) {
    if (made >= perRunCap) {
      console.log(`  · reached per-run object cap (${perRunCap}); stopping.`);
      break;
    }
    const src = join(IMAGES_DIR, `${c.slug}.jpg`);
    const out = join(PINS_DIR, `${c.slug}.pin.png`);
    const spiritLabel = SPIRIT_LABELS?.[c.spiritBase] ?? 'Cocktail';

    // image area = full width, height above the band
    const imgH = H - BAND_H;
    let photo;
    try {
      photo = await sharp(src)
        .resize(W, imgH, { fit: 'cover', position: 'centre' })
        .toBuffer();
    } catch (err) {
      console.log(`  · ${c.slug}: could not read source image (${err.message}); skipping.`);
      continue;
    }
    const band = Buffer.from(bandSvg(SITE_NAME, c.name, spiritLabel));

    let buf;
    try {
      buf = await sharp({ create: { width: W, height: H, channels: 3, background: BG } })
        .composite([
          { input: photo, top: 0, left: 0 },
          { input: band, top: H - BAND_H, left: 0 },
        ])
        .png()
        .toBuffer();
    } catch (err) {
      console.log(`  · ${c.slug}: compose failed (${err.message}); skipping.`);
      continue;
    }

    if (bytes + buf.length > PIN_MAX_BYTES) {
      console.log(`  · byte budget reached (${bytes}/${PIN_MAX_BYTES}); stopping before ${c.slug}.`);
      break;
    }
    writeFileSync(out, buf);
    bytes += buf.length;
    made++;
    console.log(`  ✓ ${c.slug}.pin.png (${(buf.length / 1024).toFixed(0)} KiB)`);
  }

  // Rebuild the feed from ALL pins that now exist on disk (idempotent).
  const rows = allPinRows(COCKTAILS, SPIRIT_LABELS);
  const files = writeFeed(rows);

  console.log(`\nmake-pins: composed ${made} new pin(s), ${(bytes / 1024).toFixed(0)} KiB this run.`);
  console.log(`Feed: ${rows.length} row(s) across ${files.length} file(s): ${files.join(', ')}\n`);
  process.exit(0);
}

/** One feed row per composed pin currently on disk. */
function allPinRows(COCKTAILS, SPIRIT_LABELS) {
  if (!existsSync(PINS_DIR)) return [];
  const bySlug = new Map(COCKTAILS.map((c) => [c.slug, c]));
  const rows = [];
  for (const f of readdirSync(PINS_DIR).sort()) {
    if (!f.endsWith('.pin.png')) continue;
    const slug = f.replace(/\.pin\.png$/, '');
    const c = bySlug.get(slug);
    if (!c) continue; // orphan pin (cocktail removed) — leave file, skip in feed
    const board = `${SPIRIT_LABELS?.[c.spiritBase] ?? 'Other'} Cocktails`;
    const hashtags = `#cocktails #${c.spiritBase} #${c.method}`;
    rows.push({
      image_url: `${PIN_PUBLIC_BASE}/pins/${f}`,
      title: c.name,
      description: `${c.description} ${hashtags}`.trim(),
      link: `${SITE_URL}/cocktail/${slug}`,
      board,
    });
  }
  return rows;
}

/** Write the feed CSV, chunked to PIN_CSV_MAX_ROWS rows per file. */
function writeFeed(rows) {
  mkdirSync(PUBLIC_DIR, { recursive: true });
  const header = ['image_url', 'title', 'description', 'link', 'board'];
  const chunks = [];
  for (let i = 0; i < Math.max(1, Math.ceil(rows.length / PIN_CSV_MAX_ROWS)); i++) {
    chunks.push(rows.slice(i * PIN_CSV_MAX_ROWS, (i + 1) * PIN_CSV_MAX_ROWS));
  }
  const written = [];
  chunks.forEach((chunk, i) => {
    const name = i === 0
      ? `${PIN_FILE_PREFIX}.csv`
      : `${PIN_FILE_PREFIX}-${String(i + 1).padStart(3, '0')}.csv`;
    const lines = [header.join(',')];
    for (const r of chunk) lines.push(header.map((h) => csvEscape(r[h])).join(','));
    writeFileSync(join(PUBLIC_DIR, name), lines.join('\n') + '\n');
    written.push(name);
  });
  return written;
}

main().catch((err) => {
  // Never break a pipeline: report and exit 0.
  console.error(`make-pins: unexpected error — ${err.message}`);
  process.exit(0);
});
