# Launch runbook

One-time steps to take Tails 'n Conk from "works locally" to live on a real
domain with accounts, reviews and photos. **None of this is needed to develop or
demo** — with no env set the app runs fully in on-device local mode. Do these in
order when you're ready to go live.

Everything is created **fresh for this project** — never reuse another project's
keys, database or domain. Secrets go in `.env` (gitignored) or the host's env UI,
never in git. The full variable list with blank placeholders is in
[`.env.example`](./.env.example); `npm run check:secrets` fails the build if a
secret leaks into the client bundle.

Prereqs: Node ≥ 22, and accounts for **Supabase**, **Cloudflare**, a **domain
registrar**, and optionally **Resend** (newsletter) and an **image API** (photos).

---

## 1. Supabase — database, accounts, reviews, photos

1. **Create a new project.** Note three values from Project Settings → API:
   Project URL, the **anon/publishable** key, and the **service-role** key.
2. **Apply the schema once.** In the SQL editor, paste all of
   [`supabase/policies.sql`](./supabase/policies.sql) and run it (or, with the
   Supabase CLI, `supabase db push` the files in `supabase/migrations/`). This
   creates every table, all RLS policies, the read views (`public_reviews`,
   `cocktail_rating_aggregates`, `public_profiles`), the subscriber-token
   trigger, **and the private `made-photos` storage bucket** — you do not create
   the bucket by hand. It is idempotent and safe to re-run.
3. **Deploy the Edge Functions** in `supabase/functions/` (six):
   `newsletter-subscribe`, `newsletter-confirm`, `newsletter-unsubscribe`,
   `send-featured`, `wall-photos`, `trigger-deploy`.
   ```bash
   supabase functions deploy newsletter-subscribe newsletter-confirm \
     newsletter-unsubscribe send-featured wall-photos trigger-deploy
   ```
   `verify_jwt` is already set per function in `supabase/config.toml`
   (the newsletter + send-featured functions are public and guard themselves with
   a token/CRON secret; `wall-photos` and `trigger-deploy` require a JWT).
4. **Set the function secrets** (server-side only):
   ```bash
   supabase secrets set \
     RESEND_API_KEY=... NEWSLETTER_FROM="hello@yourdomain.com" \
     NEWSLETTER_POSTAL_ADDRESS="..." CRON_SECRET="$(openssl rand -hex 32)" \
     DEPLOY_HOOK_URL=... DEPLOY_HOOK_METHOD=POST
   ```
   (`SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` are
   provided to functions automatically.) Newsletter + deploy-hook vars are only
   needed if you use those features.
5. **Confirm the `made-photos` bucket is Private** (Storage → Buckets). It should
   already be, from step 2.
6. **Grant yourself admin.** Create your account in the live app first (step 6),
   then in the SQL editor:
   ```sql
   update public.profiles set is_admin = true where user_id = '<your-auth-uid>';
   ```
7. **Client env** (public, anon-safe — set in Cloudflare Pages in step 6):
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## 2. Site URL

Set `EXPO_PUBLIC_SITE_URL=https://yourdomain.com`. It drives canonicals, the
sitemap, JSON-LD and the social share card. The build **auto-substitutes** your
Supabase origin into the Content-Security-Policy from `EXPO_PUBLIC_SUPABASE_URL`
(and fails if it can't), so there's no manual `_headers` edit.

## 3. Newsletter (optional — Resend)

1. Create a Resend account and **verify your sending domain** — add the SPF,
   DKIM and DMARC DNS records Resend shows you, or confirmation emails land in
   spam.
2. Set `RESEND_API_KEY`, `NEWSLETTER_FROM` (an address at the verified domain),
   `NEWSLETTER_POSTAL_ADDRESS`, and `CRON_SECRET` (step 1.4).
3. The weekly "featured cocktail" broadcast runs by calling `send-featured` with
   an `x-cron-secret` header (wire it to the GitHub Action or any scheduler).

## 4. Cocktail photos (optional — image API)

Set `IMAGE_PROVIDER` (`fal` or `openai`) plus the matching key (`FAL_KEY` /
`OPENAI_API_KEY`) to generate per-cocktail photos and per-cocktail share cards
via the pin pipeline. Until then, pages are text + the default brand share card.

## 5. Ads — currently OFF

Leave `EXPO_PUBLIC_AD_PROVIDER` blank. To enable AdSense later you must:
set `EXPO_PUBLIC_AD_PROVIDER=adsense`, `EXPO_PUBLIC_AD_CLIENT_ID`, and a numeric
`EXPO_PUBLIC_AD_SLOT_IN_FEED` / `EXPO_PUBLIC_AD_SLOT_MID_CONTENT` (a unit never
fills without a slot id); the build auto-adds the AdSense hosts to the CSP. You
**also** need a cookie-consent banner and must update the privacy page — AdSense
sets tracking cookies, which contradicts the current "cookieless analytics" copy.

## 6. Build & deploy (Cloudflare Pages)

1. Build locally to sanity-check: `npm ci && npm run build` → output is
   `apps/mobile/dist`.
2. In Cloudflare Pages, create a project from this repo:
   - **Build command:** `npm run build`
   - **Output directory:** `apps/mobile/dist`
   - **Environment variables:** all the `EXPO_PUBLIC_*` values above.
3. Add your **custom domain** (Cloudflare manages DNS + SSL).
4. Turn on **Cloudflare Web Analytics** (cookieless — matches the privacy page).
5. Optional: an **R2 bucket** for the pin/asset pipeline.

`_headers` (security + CSP + caching) and `_redirects` ship from
`apps/mobile/public/` automatically. Sitemap, robots, JSON-LD, the 404 page and
the CSP finalize are all produced by `npm run build`.

## 7. Post-deploy smoke test (~10 min)

- `npm run check:secrets` is clean (CI runs it too).
- Age gate shows on first visit; tick a few bottles → makeable list; try Spin,
  Shopping, and "Make it with a swap".
- **Account:** sign up → a `profiles` row exists; Save / Mark-made persist; sign
  in on a second device → the bar syncs.
- **Reviews:** post one → it appears (via `public_reviews`). Star averages bake
  at build time (`fetch-ratings`), so they show after the next deploy.
- **Photos:** upload → status `pending`; approve in the moderate tool → it shows
  on the wall with the author's name.
- **Newsletter:** subscribe → confirm email arrives (check spam if DNS is new);
  confirm + unsubscribe links work.
- **Share:** paste a page link into chat → the brand card preview renders.
- Re-run Lighthouse against the live site — performance is markedly better on the
  CDN (brotli + HTTP/2 + caching) than on a local server.

## 8. Notes

- **Env reference:** only `EXPO_PUBLIC_*` vars reach the browser (anon-safe);
  everything else is server/CI. See `.env.example`.
- **Rollback:** it's a static export — redeploy the previous Pages build. The SQL
  migrations are idempotent, so re-applying `policies.sql` is safe.
- **Fonts:** the site currently loads Fraunces + Inter from Google Fonts
  (render-blocking + an external dependency). Self-hosting them under
  `public/fonts/` is a worthwhile post-launch performance + privacy win.
