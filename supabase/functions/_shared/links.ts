// Shared link + period helpers for the newsletter functions.

import { requireEnv } from "./supabase.ts";

/** Base URL of the deployed edge functions, e.g. https://<ref>.functions.supabase.co */
export function functionsBase(): string {
  // SUPABASE_URL is https://<ref>.supabase.co; functions are served from
  // https://<ref>.supabase.co/functions/v1/<name>.
  return `${requireEnv("SUPABASE_URL").replace(/\/+$/, "")}/functions/v1`;
}

/** Public site origin (for links back into the app), falling back to the functions host. */
export function siteBase(): string {
  const site = Deno.env.get("EXPO_PUBLIC_SITE_URL");
  return (site && site.replace(/\/+$/, "")) || functionsBase();
}

/** Tokenized confirm link (opened from the confirmation email). */
export function confirmUrl(email: string, token: string): string {
  const u = new URL(`${functionsBase()}/newsletter-confirm`);
  u.searchParams.set("email", email);
  u.searchParams.set("token", token);
  return u.toString();
}

/** Tokenized unsubscribe link (opened from any newsletter email). */
export function unsubscribeUrl(email: string, token: string): string {
  const u = new URL(`${functionsBase()}/newsletter-unsubscribe`);
  u.searchParams.set("email", email);
  u.searchParams.set("token", token);
  return u.toString();
}

/**
 * ISO week-ish period key, e.g. "2026-W37". Mirrors packages/core
 * featured.periodKey() so the newsletter and the app agree on the period.
 */
export function periodKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Minimal HTML escape for interpolating user-controlled strings into markup. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
