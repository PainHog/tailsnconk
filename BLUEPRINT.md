# Portable Architecture Blueprint

A niche-agnostic blueprint of this project's engine, extracted so you can build a
**different discovery site in a new niche** on the same foundation. The running
example is a culinary-discovery site (spin a globe → narrow to a place → get one
item, with live "variant" rewriting). Everything below is described so the same
machine works for any domain that is:

> a **hierarchy of categories** leading to **items**, where a user **filters**,
> **randomly discovers**, **saves/collects**, and the item can be **re-expressed**
> under user-selected constraints.

Swap "continent → country → region → recipe" for, e.g., "genre → subgenre →
era → album", "discipline → sport → league → drill", "biome → region → trail →
hike". The engine does not care what the nouns are.

No secrets, keys, or dataset rows appear here by design — only structure,
env-var **names**, and logic.

---

## 1. Tech stack and versions

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Language | TypeScript | ~6.0 | strict; shared `packages/core` is framework-free |
| Runtime | Node.js | >= 22 | monorepo tooling + build scripts |
| Monorepo | npm workspaces | — | `apps/*`, `packages/*` |
| App framework | Expo | ~57 | one codebase → web + iOS + Android |
| UI runtime | React / React Native | 19.2 / 0.86 | `react-native-web` ~0.21 for web |
| Router | expo-router | ~57 | file-based routing; **static web export** |
| 3D | three.js | ~0.172 | the interactive "spinner" visual (web + native variants) |
| Local storage | @react-native-async-storage | 2.2 | device-side state / dev backend |
| Backend SDK | @supabase/supabase-js | ^2.110 | auth, Postgres (RLS), Storage, Edge Functions |
| Static hosting | Cloudflare Pages | via `wrangler` ^4 | serves the exported static site |
| Object storage (assets) | Cloudflare R2 | — | image/pin hosting (free-tier gated) |
| Analytics | Cloudflare Web Analytics | — | cookieless, edge-injected, no consent banner |
| Transactional email | Resend | — | double-opt-in newsletter (via Edge Function) |
| Image generation (build-time tooling) | fal.ai or OpenAI Images | — | selected by `IMAGE_PROVIDER`; not a runtime dep |
| Image processing (tooling) | sharp | — | webp/jpg twins, pin composition |
| Test | `node --test` + tsx | — | core domain unit tests |

**Key architectural facts**
- The **web build is a fully static export** (`expo export --platform web`,
  `web.output: "static"`). There is no app server. Dynamic behavior is either
  baked at build time or done client-side against Supabase.
- `packages/core` imports **no** React/React Native — it is pure domain logic and
  is unit-tested in isolation. This is what makes the engine portable.
- Config for the client backend is **inlined at build** from `EXPO_PUBLIC_*`
  env vars (public anon config only; see §8).

---

## 2. Architecture and folder structure

```
/
├─ package.json                 # npm-workspace root; build/test/seo/image scripts
├─ apps/
│  └─ mobile/                   # the Expo app (web + native)
│     ├─ app.json               # Expo config; web.output=static, scheme, icons
│     ├─ src/
│     │  ├─ app/                # expo-router FILE-BASED ROUTES (see §6)
│     │  │  ├─ _layout.tsx      # root layout / providers
│     │  │  ├─ +html.tsx        # server-rendered HTML shell (SEO head, JSON-LD)
│     │  │  ├─ +not-found.tsx   # 404 (copied to 404.html at finalize)
│     │  │  ├─ index.tsx        # home (the "spinner")
│     │  │  ├─ explore.tsx      # filtered discovery entry
│     │  │  ├─ recipes.tsx      # full item index
│     │  │  ├─ recipe/[slug].tsx# ITEM detail page (heavy content + JSON-LD)
│     │  │  ├─ collections.tsx  # hub index
│     │  │  ├─ collection/[slug].tsx # a single crawlable hub
│     │  │  ├─ kitchen-school*  # evergreen how-to content (topic pages)
│     │  │  ├─ account.tsx      # auth, saved items, prefs, admin dashboard
│     │  │  ├─ about/privacy/terms.tsx # static marketing/legal
│     │  │  ├─ image-review / video-review / validate / moderate.tsx # ADMIN-only
│     │  ├─ components/         # presentational + interactive components (see §5)
│     │  ├─ lib/
│     │  │  ├─ backend/         # THE BACKEND SEAM (see §5.0)
│     │  │  │  ├─ index.ts      #   picks local vs cloud at startup
│     │  │  │  ├─ types.ts      #   the Backend interface (single source of truth)
│     │  │  │  ├─ supabase.ts   #   cloud implementation
│     │  │  │  ├─ local.ts      #   on-device implementation (dev / offline)
│     │  │  │  └─ public-config.ts # committed PUBLIC anon config (url + anon key)
│     │  │  ├─ store.ts         # AsyncStorage wrapper (device state)
│     │  │  ├─ baked-ratings.ts # build-time snapshot of aggregate ratings
│     │  │  └─ baked-overrides.ts # build-time snapshot of admin text overrides
│     │  └─ constants / hooks / assets
│     └─ scripts/               # BUILD-TIME steps run during export:web
│        ├─ generate-sitemap.mjs
│        ├─ fetch-overrides.mjs      # bake admin text overrides into the build
│        ├─ fetch-ratings.mjs        # bake aggregate ratings into the build
│        ├─ gen-sunday-spin-feed.mjs # emit the rotating "featured item" feed JSON
│        ├─ inline-critical-css.mjs  # inline above-the-fold CSS per page
│        └─ finalize-export.mjs      # 404.html, cleanup
├─ packages/
│  └─ core/                     # FRAMEWORK-FREE DOMAIN ENGINE (portable)
│     └─ src/
│        ├─ types.ts            # domain types (hierarchy, item, constraints)
│        ├─ geography.ts        # the CATEGORY TREE (continent/country/region)
│        ├─ recipes/            # the ITEM DATASET (per-continent source files)
│        ├─ recipes-light.ts    # light item list (browse/spin; no heavy content)
│        ├─ recipes-meta.gen.ts # GENERATED: precomputed filter metadata per item
│        ├─ recipes-audit.gen.ts# GENERATED: quality-audit snapshot
│        ├─ spin.ts             # THE DISCOVERY ENGINE (§4)
│        ├─ diet.ts             # THE VARIANT/CONSTRAINT ENGINE (§4)
│        ├─ courses.ts          # item sub-type taxonomy + active/archived gating
│        ├─ protein.ts          # a derived facet used by filters
│        ├─ collections.ts      # crawlable HUB builder (SEO)
│        ├─ passport.ts         # retention: progress, badges, ranks (§5)
│        ├─ seo.ts / recipe-jsonld.ts # structured data + meta (§6)
│        ├─ nutrition.ts / units.ts / shopping.ts / glossary.ts # domain helpers
│        ├─ featured.ts / seasonal.ts # deterministic rotation helpers
│        ├─ image-ledger.ts     # SOURCE: per-item generation prompt + status
│        ├─ image-status.gen.ts # GENERATED: light "which item has a picture" map
│        └─ scripts/            # gen:meta codegen (meta + audit)
├─ supabase/
│  ├─ policies.sql              # APPLY-ONCE idempotent schema + RLS (see §3)
│  ├─ config.toml               # per-function verify_jwt settings
│  └─ functions/                # Deno Edge Functions (see §5)
│     ├─ _shared/               #   shared helpers (email, cors, json)
│     ├─ newsletter-subscribe / -confirm / -unsubscribe
│     ├─ send-sunday-spin       #   the scheduled broadcast job
│     ├─ wall-photos            #   signs short-lived URLs for approved photos
│     └─ trigger-deploy         #   admin-triggered static rebuild
├─ scripts/                     # repo-level tooling (not shipped)
│  ├─ images.mjs                # image pipeline: sync/generate/approve/reject
│  ├─ videos.mjs                # optional video pipeline (parallel to images)
│  ├─ make-pins.mjs / upload-pins.mjs # Pinterest automation (§5)
│  ├─ seo-audit.mjs             # in-repo SEO regression check (CI)
│  ├─ check-secrets.mjs         # fails build if a secret leaks into app source
│  └─ coverage.mjs              # dataset coverage report
└─ .github/workflows/           # CI + the image/video/pin automation jobs
```

---

## 3. Data model (schema shape only, zero rows)

Postgres via Supabase. Auth is Supabase's built-in `auth.users`. All app tables
carry **Row-Level Security**; the whole schema lives in one idempotent
`policies.sql` (drop-then-create policies, `create table if not exists`,
`add column if not exists`) so it is safe to paste once and re-run.

**Identity convention:** item identifiers and category identifiers are **stable
text slugs** (e.g. an item id, a leaf-category id), never DB foreign keys into a
content table — because the content lives in the code/dataset (`packages/core`),
not the database. The DB only stores **user-generated** data keyed by those
slugs.

### User-owned data (RLS: each user sees/writes only their own)

**profiles** — one per auth user
| column | type | notes |
|---|---|---|
| user_id | uuid PK | FK → auth.users, on delete cascade |
| name | text | 1–80 chars; the only public column (via a `public_profiles` view) |
| prefs | jsonb | saved filter prefs, e.g. `{ "diets": [...], "protein": ... }` |
| created_at | timestamptz | |

**saved_recipes** — a user's collection ("save this item")
| column | type | notes |
|---|---|---|
| user_id | uuid | FK → auth.users |
| recipe_id | text | item slug |
| created_at | timestamptz | |
| PK | (user_id, recipe_id) | one save per item |

*Trigger:* `enforce_saves_cap` — caps saves per user (abuse bound).

**passport_stamps** — retention/collection progress ("you've explored X")
| column | type | notes |
|---|---|---|
| user_id | uuid | FK → auth.users |
| region_id | text | leaf-category slug |
| created_at | timestamptz | |
| PK | (user_id, region_id) | |

**reviews** — ratings + comments on an item (the comments subsystem)
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | FK → auth.users |
| recipe_id | text | item slug |
| rating | int | 1–5 (checked) |
| body | text | ≤2000 chars |
| created_at | timestamptz | |
| unique | (user_id, recipe_id) | one review per user per item |

*Trigger:* `enforce_review_rate_limit` — caps reviews/user/hour.

### Community data

**sunday_cooking** — "I'm doing the featured item this period" communal counter
| column | type | notes |
|---|---|---|
| week_key | text | period bucket (deterministic, see §5) |
| user_id | uuid | FK → auth.users |
| created_at | timestamptz | |
| PK | (week_key, user_id) | |

- View **sunday_cooking_counts** `(week_key, count)` — a **definer-rights view**
  that aggregates the owner-only rows into public counts **without exposing any
  user_id**. Granted to anon + authenticated. (Reusable pattern: public
  aggregates over private rows.)

**cooked_photos** — user photo submissions with manual approval
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| week_key | text | period bucket |
| recipe_id | text | item slug |
| user_id | uuid | FK → auth.users |
| user_name | text | denormalized display name (set server-side by trigger) |
| storage_path | text | path in the PRIVATE bucket, must be `<uid>/...` |
| caption | text | ≤200 chars |
| status | text | `pending` \| `approved` \| `rejected` |
| created_at / approved_at | timestamptz | |

*Trigger:* `enforce_cooked_photo_insert` — forces `status='pending'`, validates
`storage_path` begins with the caller's uid, sets `user_name` from the profile
(client cannot spoof it), caps pending uploads per user.
Private Storage bucket `cooked-photos` (not public; size + mime limited); storage
RLS: a user reads/writes only `<uid>/...`, admins moderate all.

### Newsletter

**subscribers** — double opt-in list
| column | type | notes |
|---|---|---|
| email | text PK | ≤320 chars |
| source | text | where they signed up (segmentation) |
| confirmed / unsubscribed | boolean | default false |
| confirmed_at | timestamptz | |
| token | uuid | per-subscriber secret for confirm/unsubscribe links (server-only) |
| confirm_sent_at | timestamptz | rate-limits confirmation resends |
| created_at | timestamptz | |

RLS insert policy allows an anonymous insert **only** as
`confirmed=false AND unsubscribed=false` (cannot self-confirm; confirmation flips
server-side). No SELECT policy → the list is never anon-readable.

**newsletter_log** — idempotency ledger for the broadcast job
| column | type | notes |
|---|---|---|
| week_key | text PK | the period an issue is for |
| sent_at | timestamptz | |
| count | int | recipients |

RLS on, **no policy** → service-role only. The send job "claims" a `week_key`
here before sending so a re-run can't double-send.

### Admin / operations data

**recipe_reviews** — internal QA notes per item (`good`/`issue` + notes), admin-only.
**image_notes** — per-item image-prompt notes that survive regen cycles, admin-only.
**text_overrides** — live copy edits: `key` (opaque, e.g. `item:<id>:story`) → `value` (text/JSON). **Public-read, admin-write** — lets owners rewrite prose without a code deploy; baked into the next build.

### Functions / access control primitives
- `is_admin()` — SECURITY DEFINER, reads `profiles.is_admin`; every admin policy calls it.
- `guard_admin_flag()` — trigger; stops a user granting themselves admin via a profile update.
- `subscriber_stats()` — SECURITY DEFINER, returns counts only, gated to admins; `execute` revoked from `public`, granted to `authenticated`.

**Reusable RLS patterns to copy verbatim:** owner-only tables
(`auth.uid() = user_id` on select/insert/delete, `WITH CHECK` on update);
public aggregate **definer views** over private rows; a narrow **public
projection view** exposing only safe columns (name) while the base table stays
owner-private; service-role-only tables (RLS on, no policy).

---

## 4. The core engine (how inputs map to outputs)

Two independent engines, both in `packages/core`, both pure and unit-tested.

### 4A. Discovery engine (`spin.ts`) — hierarchy + filters → one item

**Domain shape:** a fixed **category tree** `Level0 → Level1 → Level2 → Item`
(here Continent → Country → Region → Recipe). Items carry **precomputed filter
metadata** (`recipes-meta.gen.ts`) so filtering never touches heavy content.

**Filter set (`SpinFilters`)** — all optional, all niche-mappable:
- pinned category at any level (`continentId`, `countryId`)
- item sub-type (`course`)
- a derived facet (`protein`)
- a numeric budget (`maxTotalMinutes`)
- an ordinal (`difficulty`)
- a set of constraints that must ALL hold (`diets[]`)

**Core predicate:**
```
recipeMatches(item, filters):
    if not isActive(item.subtype): return false          # archived types hidden
    if filters.subtype   and item.subtype   != filters.subtype:   return false
    if filters.facet     and item.facet     != filters.facet:     return false
    if filters.maxBudget and item.cost       > filters.maxBudget:  return false
    if filters.ordinal   and item.ordinal   != filters.ordinal:   return false
    return filters.constraints ⊆ item.supportedConstraints   # ALL must hold
```

**Eligibility (never dead-end):** every *unpinned* level only offers choices that
lead to ≥1 matching item.
```
eligibleItems(filters)        = all items where recipeMatches AND category filters hold
eligibleLevel0(filters)       = distinct Level0 of eligibleItems
eligibleLevel1(l0, filters)   = Level1s under l0 that contain a matching item
eligibleLevel2(l1, filters)   = Level2s under l1 that contain a matching item
```
Pinning is the deliberate exception: a pinned category **bypasses** eligibility,
so an over-constrained pin+filter combo can legitimately have nothing to land on.

**The spin (`trySpin`)** — returns `undefined` (not throw) when nothing qualifies,
so the UI can explain why:
```
trySpin(filters, rng=random, recent=[]):
    l0 = pinned Level0 or pick(eligibleLevel0(filters))          ; if none → undefined
    pool = pinned Level1 or eligibleLevel1(l0, filters)
    l1 = pick(withoutRecent(pool, recent))                       ; if none → undefined
    l2 = pick(eligibleLevel2(l1, filters))                       ; if none → undefined
    item = pick(matching items under l2)                         ; if none → undefined
    return {l0, l1, l2, item}
```
`spin()` is the throwing form for callers that already proved a match exists.

**No-repeat rule (session variety):** the last `NO_REPEAT_WINDOW` (=2) *distinct*
Level1 categories rolled are locked out of the next pick, so the biggest
categories don't dominate; the lockout **stands down** rather than empty the pool
(so a single-category filter still works). `rememberCountry`/`withoutRecentCountries`
are the reusable helpers; the caller just keeps and passes back a small history list.

**Determinism:** `rng` is injectable → reproducible tests and deterministic
"featured item of the period" selection.

**To re-use on a new dataset:** keep `spin.ts` as-is; replace the category tree
(`geography.ts`), the item dataset, and the fields referenced by `recipeMatches`
(rename `course`/`protein`/`maxTotalMinutes`/`difficulty`/`diets` to your facets).

### 4B. Variant/constraint engine (`diet.ts`) — item + constraints → rewritten item

Re-expresses an item to satisfy user-selected constraints, honestly.

**Model:**
- **Categories** = the "contains" tags an item part can carry (here allergen-ish:
  dairy, gluten, meat, …). Generic meaning: *properties a component has*.
- **Constraints** (`DietMeta`) = `{ id, label, forbids: Category[] }`. A constraint
  forbids a set of categories.
- Each **item part** (`Ingredient`) declares what it `contains`, and may declare
  a keyed **swap** per constraint: `swaps[constraintId] = { replacement, contains? }`.
- `contains` on a swap is optional; when omitted the engine **infers** the
  replacement's categories as `original.categories − constraint.forbids`.

**Combinable rewrite (`adaptRecipe(item, constraints[])`):**
```
forbidden = union(constraint.forbids for each selected constraint)
for each part:
    if part.contains ∩ forbidden == ∅: keep part
    else:
        choose a swap that resolves ALL violated constraints at once
        (a swap's resulting contains must be disjoint from `forbidden`)
        if such a swap exists: use it
        else: flag the part as unresolvable (UI tells the truth)
```
The key correctness property: selecting **dairy-free + gluten-free together**
must never leave a component that violates either — swaps are chosen against the
*combined* forbidden set, not one constraint at a time. This is exactly what the
core unit tests assert.

**Precompute for speed (`gen:meta`):** a codegen step walks every item and writes
`supportedConstraints` (which constraint-sets it can satisfy) and the derived
facet into `recipes-meta.gen.ts`, so the discovery engine filters on cheap
metadata and never loads the heavy per-item content.

**Dormant constraints (`pending: true`):** a constraint can be defined and fully
tested but withheld from all UI until the dataset is fully tagged for it — so you
never ship a filter that lies. Promote by removing one flag.

---

## 5. Reusable subsystems (niche-agnostic)

### 5.0 The backend seam (the reuse keystone)
`lib/backend/types.ts` defines a single `Backend` interface; the app talks **only**
to it. Two implementations: `local.ts` (AsyncStorage, no server — dev/offline) and
`supabase.ts` (cloud). `index.ts` picks cloud when `EXPO_PUBLIC_SUPABASE_*` are
present, else local. Launch is a config change, not a code change. **Reuse as-is**;
add/rename methods per niche.

### 5.1 Email capture (double opt-in newsletter)
- `subscribers` table (§3) + three Edge Functions: **subscribe** (public; inserts
  an unconfirmed row, rate-limited via `confirm_sent_at`, emails a tokenized
  confirm link), **confirm** (GET shows an interstitial → POST flips `confirmed`
  server-side), **unsubscribe** (GET interstitial + RFC 8058 one-click POST).
- A scheduled **broadcast** function (`send-sunday-spin`) validates the current
  featured item, **claims the period in `newsletter_log` before sending** (so a
  re-run can't double-send), and sends via Resend in capped batches.
- Auth notes: email-link functions set `verify_jwt=false` (opened from an inbox);
  the broadcast is protected by a `CRON_SECRET` header and fails closed if unset.
- Generic pattern: unconfirmed-insert + tokenized server-side confirm + idempotent
  period-claim broadcast. Niche-independent.

### 5.2 Retention / badges (`passport.ts`)
- Pure functions over the user's `passport_stamps` (a set of leaf-category slugs):
  `continentProgress` (per-branch completion %), `earnedBadges`
  (bronze/silver/gold/platinum tiers), `passportRank`, `topTier`, counts.
- Stateless and dataset-driven — thresholds derive from the live category tree, so
  they auto-scale when the dataset grows. **Reuse as-is**; rename "stamp/region"
  to your leaf unit ("trail", "album", "level").

### 5.3 User photo submissions (moderated)
- `cooked_photos` + a **private** Storage bucket + insert trigger + a `wall-photos`
  Edge Function that signs **short-lived URLs for approved photos only** (service
  role). Admin moderation UI at `/moderate`. Client strips EXIF by re-encoding
  through a canvas before upload.
- Safety model worth copying: nothing user-uploaded is ever public; approval is
  required; storage path is bound to `<uid>/…`; display name is set server-side.

### 5.4 Comments + ratings
- The `reviews` table is both (rating 1–5 + free text body), one per user per item,
  DB-rate-limited. Aggregate rating is computed and **baked into the static build**
  (`fetch-ratings.mjs` → `baked-ratings.ts`) so the number shown on-page matches
  the `AggregateRating` in structured data. Author display names come from the
  narrow `public_profiles` view.

### 5.5 Ad-slot placement (recommended pattern — not yet implemented here)
- No ad component ships in this codebase today. The intended, niche-agnostic
  pattern: a single `<AdSlot placement="..."/>` component reading a provider id
  from an `EXPO_PUBLIC_*` env var, rendered at a few fixed placements (in-feed on
  index/browse, mid-content on item pages). Keep the provider script host on the
  CSP allowlist (`public/_headers`) and gate rendering to web + production so
  admin/dev views stay clean. Because pages are static, prefer a client-side,
  consent-appropriate ad script; keep it out of `packages/core`.

### 5.6 Pinterest automation / publishing flow
Build-time + CI, no runtime dependency:
1. `make-pins.mjs` composes a vertical 1000×1500 pin per item that has an approved
   picture (image + branded caption band) with `sharp`, and writes a **feed CSV**
   describing each pin (image URL, title, target link, board).
2. `upload-pins.mjs` pushes new pin images to Cloudflare **R2** using
   `R2_*` creds, with **hard free-tier gates** (max bytes/objects/among-run,
   idempotent skip of already-uploaded pins).
3. `sync-pins.yml` (manual dispatch) runs both and publishes `pins-feed*.csv` as a
   downloadable artifact to import into a bulk scheduler (Tailwind / Pinterest bulk
   create). The scheduler-facing feed is chunked to respect the platform's
   per-file / per-account scheduling caps.
- Generic pattern: **render share-optimized image + emit a scheduler feed +
  host images on cheap object storage**, all gated so cost can't run away.

### 5.7 Content-generation pipeline (images/videos)
- `image-ledger.ts` is the source of truth: per-item generation **prompt** +
  status (`missing`/`pending-approval`/`approved`). `scripts/images.mjs` has
  `sync` (recompose prompts from item data), `generate` (call the provider chosen
  by `IMAGE_PROVIDER`), `approve`/`reject` (human-in-the-loop). Approved images get
  webp (in-app) + jpg (og) twins; a light generated map (`image-status.gen.ts`) is
  what the app bundle actually imports (keeps the heavy prompt ledger out of the
  shipped chunk). GitHub Actions wrap generate/approve/replace as dispatchable jobs.

---

## 6. Page types, routing, and SEO / structured data

**Routing:** expo-router **file-based**, statically exported. Dynamic segments
`[slug]` are enumerated at build via `generateStaticParams()` from the dataset, so
every item/hub/topic becomes a real prerendered HTML file. `+html.tsx` is the
server-render-only document shell where per-page `<head>`, meta, and JSON-LD are
injected; interactive components render `null` server-side to avoid hydration
mismatch.

**Page types**
| Type | Route | Purpose |
|---|---|---|
| Home / discovery | `index.tsx` | the interactive spinner |
| Filtered discovery | `explore.tsx` | pre-set filters then spin |
| Item index | `recipes.tsx` | full crawlable list |
| **Item detail** | `recipe/[slug].tsx` | primary SEO page: content + all JSON-LD |
| Hub index / hub | `collections.tsx`, `collection/[slug].tsx` | SEO category hubs |
| Evergreen topics | `kitchen-school*` | how-to content pages |
| Account | `account.tsx` | auth, saves, prefs, admin dashboard |
| Static | `about/privacy/terms.tsx` | marketing + legal |
| Admin-only | `image-review`, `video-review`, `validate`, `moderate` | gated tools, noindex |

**Structured data (schema.org), all built into static HTML:**
- **Recipe** (item) JSON-LD with name/description/cuisine/category, prep/cook/total
  ISO-8601 durations, `HowToStep` steps, `Person` author, `Organization` publisher,
  `AggregateRating` (from the baked snapshot), optional `VideoObject`, nutrition.
- **BreadcrumbList** reflecting the category path (gated to indexable hubs only).
- **Person** (author) + **Organization** (publisher) with `SOCIAL_LINKS` sameAs.
- **FAQPage** on the item and about pages.
- Per-page `og:image` uses a `.jpg` twin (`ogJpg()`), and the item page preloads
  its LCP image (`<link rel=preload as=image>`).

**SEO hubs (`collections.ts`):** a hub is generated **only** when ≥ `MIN_RECIPES`
(=4) items qualify (diet/facet/category/theme), so thin pages never ship; a shared
`isIndexableCollection` gate drives both the page's robots meta and the sitemap, so
the two never disagree. `seo-audit.mjs` runs in CI to catch regressions
(missing/dupe titles, canonical drift, orphaned sitemap entries).

**Live copy edits without deploy:** `text_overrides` (admin-write, public-read) are
fetched and **baked into each build** (`fetch-overrides.mjs`), overlaying prose
(story/steps/category "about") in the owners' voice while ingredients — which carry
the swap metadata the constraint engine depends on — stay in code.

**Performance:** critical CSS inlined per page (`inline-critical-css.mjs`); the
heavy per-item content + constraint/nutrition engines live behind a separate
`@core/full` barrel imported only by the item page, so browse/hub pages never pull
that weight.

---

## 7. Generic engine (reuse as-is) vs Niche-specific (replace per site)

### Reuse as-is (the portable engine)
- `packages/core/src/spin.ts` — discovery/narrowing + eligibility + no-repeat.
- `packages/core/src/diet.ts` — combinable constraint/variant rewriting (rename facets).
- `packages/core/src/passport.ts` — progress/badges/ranks (rename leaf unit).
- `packages/core/src/collections.ts` — crawlable-hub builder with a min-size gate.
- `packages/core/src/seo.ts` + `recipe-jsonld.ts` — meta + structured-data scaffolding (swap schema.org `@type`).
- `packages/core/src/{courses,protein,featured,seasonal,units,glossary,shopping}.ts` — generic facet/rotation/helpers (keep the ones that map).
- The **backend seam** (`lib/backend/*`) and both implementations.
- `supabase/policies.sql` **patterns**: owner-only RLS, admin functions, definer aggregate views, private-bucket + signed-URL flow, service-role-only tables.
- All subsystems in §5 (newsletter, photos, comments, badges, pins pipeline, content-gen pipeline).
- Build chain: static export, sitemap, critical-CSS inline, baked ratings/overrides, `seo-audit`, `check-secrets`, the GitHub Actions shapes.
- The interactive "spinner" component structure (three.js web/native split) — reskin the visual.

### Niche-specific (replace per site)
- **The category tree** (`geography.ts`) and its `about`/blurb copy.
- **The item dataset** (`recipes/` source files) and everything domain-worded in `types.ts` (rename Continent/Country/Region/Recipe; rename Category/Diet to your properties/constraints).
- The concrete **facets** referenced by `recipeMatches` (course/protein/time/difficulty/diets) → your filters.
- All **brand + marketing copy** (about/terms/privacy, author identity `SITE_AUTHOR`, `SOCIAL_LINKS`, taglines, FAQs), icons/splash, theme colors.
- **Generation prompts** (`image-ledger.ts`) and any media.
- The **schema.org `@type`** per page (Recipe → Product/Course/Event/… as fits).
- Redirects (`public/_redirects`), CSP allowlist (`public/_headers`), sitemap host, canonical domain.
- Regenerate all `*.gen.ts` via `gen:meta` after the dataset changes.

---

## 8. "Fresh per site" checklist (everything created new per deployment)

**Accounts / projects to create new**
- [ ] New **Supabase project** (its own Postgres, Auth, Storage). Note its project URL + anon (publishable) key + service-role key.
- [ ] New **Cloudflare Pages** project pointed at the new repo/build output; set the custom **domain**.
- [ ] New **Cloudflare R2** bucket (if using the pin/asset flow) + R2 access keys, or repoint asset hosting.
- [ ] New **Cloudflare Web Analytics** site token (enable in dashboard; the beacon is edge-injected).
- [ ] New **Resend** account + **verified sending domain** (if using the newsletter).
- [ ] New **image-generation** provider account/key (only if using the content-gen pipeline).
- [ ] New **Git repo** + GitHub Actions secrets for the CI jobs.

**Database / backend**
- [ ] Apply `supabase/policies.sql` once in the new project's SQL editor (idempotent).
- [ ] Deploy the Edge Functions; set each function's `verify_jwt` per `config.toml`.
- [ ] Create the private Storage bucket (the SQL does this; confirm it exists and is **not public**).
- [ ] Grant your own account admin (`profiles.is_admin = true`) for the moderation/edit tools.

**Environment variables (names only — never commit values)**

*Client build (public, inlined into the static site — anon only):*
- [ ] `EXPO_PUBLIC_SUPABASE_URL` — new project's URL
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` — new project's public anon key
- [ ] (add an `EXPO_PUBLIC_*` var for the ad provider id if you build §5.5)

*Edge Functions (server-side secrets):*
- [ ] `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (service role is server-only)
- [ ] `RESEND_API_KEY`, `NEWSLETTER_FROM`, `NEWSLETTER_POSTAL_ADDRESS` (CAN-SPAM), `CRON_SECRET`
- [ ] `DEPLOY_HOOK_URL`, `DEPLOY_HOOK_METHOD`, `DEPLOY_HOOK_AUTHORIZATION`, `DEPLOY_HOOK_BODY` (admin-triggered rebuild)

*CI / tooling (GitHub Actions secrets — content + pin pipelines only):*
- [ ] `IMAGE_PROVIDER` and provider creds: `FAL_KEY`/`FAL_MODEL`/`FAL_VIDEO_MODEL`/`FAL_VIDEO_DURATION`, or `OPENAI_API_KEY`/`OPENAI_IMAGE_MODEL`; `IMAGE_MAX_ATTEMPTS`
- [ ] `EXA_API_KEY` (only if using the research/audit tooling)
- [ ] `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`, `PIN_PUBLIC_BASE`, and pin tuning (`PIN_PER_DAY`, `PIN_START_DATE`, `PIN_FILE_PREFIX`, `PIN_SKIP`)

**Content / brand (author fresh)**
- [ ] Replace the category tree + item dataset; run `npm run gen:meta`.
- [ ] Replace brand identity (`SITE_AUTHOR`, `SOCIAL_LINKS`), all marketing/legal copy, icons/splash, theme.
- [ ] Set the canonical domain everywhere (sitemap host, `+html.tsx` canonicals, `public/_headers` CSP, `public/_redirects`).
- [ ] Regenerate media (or run the content-gen pipeline) and approve it.

**Verify before launch**
- [ ] `npm run typecheck`, `npm run test:core`, `npm run seo:audit`, `npm run check:secrets` all green.
- [ ] `npm run build` produces a clean static export; spot-check an item page's JSON-LD and an admin page's `noindex`.
- [ ] Confirm no secret is in the client bundle (that's what `check-secrets.mjs` enforces).

---

*Generated as a read-only architecture extraction. Contains no secrets and no
dataset content — only structure, env-var names, and logic.*
