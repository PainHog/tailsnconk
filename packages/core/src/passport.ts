/**
 * RETENTION / BADGES (adapted from the blueprint's passport.ts).
 *
 * Pure functions over the set of cocktail slugs a user has marked "made". The
 * blueprint's leaf unit was a region; here it is a cocktail, grouped by base
 * spirit. Thresholds derive from the LIVE catalog so they auto-scale as the
 * dataset grows. Stateless and framework-free.
 */

import type { Cocktail, SpiritBase } from './types';

export interface BaseProgress {
  spiritBase: SpiritBase;
  made: number;
  total: number;
  /** 0..1 */
  pct: number;
}

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Badge {
  id: string;
  label: string;
  tier: BadgeTier;
  /** For base-completion badges. */
  spiritBase?: SpiritBase;
}

function madeSet(made: readonly string[]): Set<string> {
  return new Set(made);
}

/** Per-base-spirit completion. */
export function baseProgress(cocktails: readonly Cocktail[], made: readonly string[]): BaseProgress[] {
  const seen = madeSet(made);
  const totals = new Map<SpiritBase, number>();
  const dones = new Map<SpiritBase, number>();
  for (const c of cocktails) {
    totals.set(c.spiritBase, (totals.get(c.spiritBase) ?? 0) + 1);
    if (seen.has(c.slug)) dones.set(c.spiritBase, (dones.get(c.spiritBase) ?? 0) + 1);
  }
  return [...totals.entries()]
    .map(([spiritBase, total]) => {
      const done = dones.get(spiritBase) ?? 0;
      return { spiritBase, made: done, total, pct: total ? done / total : 0 };
    })
    .sort((a, b) => a.spiritBase.localeCompare(b.spiritBase));
}

const COUNT_TIERS: Array<{ tier: BadgeTier; min: number }> = [
  { tier: 'platinum', min: 20 },
  { tier: 'gold', min: 10 },
  { tier: 'silver', min: 5 },
  { tier: 'bronze', min: 1 },
];

/** Badges earned: an overall count tier plus a completion badge per finished base. */
export function earnedBadges(cocktails: readonly Cocktail[], made: readonly string[]): Badge[] {
  const seen = madeSet(made);
  const count = cocktails.filter((c) => seen.has(c.slug)).length;
  const badges: Badge[] = [];

  const countTier = COUNT_TIERS.find((t) => count >= t.min);
  if (countTier) {
    badges.push({ id: `count-${countTier.tier}`, label: `${count} cocktails made`, tier: countTier.tier });
  }

  for (const p of baseProgress(cocktails, made)) {
    if (p.total > 0 && p.made === p.total) {
      badges.push({
        id: `base-${p.spiritBase}`,
        label: `${titleCase(p.spiritBase)} complete`,
        tier: 'gold',
        spiritBase: p.spiritBase,
      });
    }
  }
  return badges;
}

/** A human title based on how much of the catalog the user has explored. */
export function passportRank(cocktails: readonly Cocktail[], made: readonly string[]): string {
  const total = cocktails.length || 1;
  const seen = madeSet(made);
  const count = cocktails.filter((c) => seen.has(c.slug)).length;
  const pct = count / total;
  if (pct >= 1) return 'Master Mixologist';
  if (pct >= 0.66) return 'Head Bartender';
  if (pct >= 0.33) return 'Home Bartender';
  if (count > 0) return 'Apprentice';
  return 'Newcomer';
}

export function madeCount(cocktails: readonly Cocktail[], made: readonly string[]): number {
  const seen = madeSet(made);
  return cocktails.filter((c) => seen.has(c.slug)).length;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
