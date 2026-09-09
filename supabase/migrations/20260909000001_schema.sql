-- ============================================================================
-- tailsnconk — schema (tables + columns)
-- ----------------------------------------------------------------------------
-- Migration 1 of 2. Creates every application table for the cocktail-discovery
-- app ("what's in your bar"). Content (cocktails, ingredients) lives in code
-- (packages/core); the database only stores USER-GENERATED data keyed by stable
-- TEXT SLUGS (e.g. cocktail_id = 'old-fashioned'). Auth is Supabase's built-in
-- auth.users. RLS + policies + triggers + views + storage live in migration 2.
--
-- Idempotent by design: `create table if not exists` + `add column if not
-- exists`, so this file is safe to paste once and re-run.
-- ============================================================================

-- gen_random_uuid() (available in core PG13+; pgcrypto guarantees it everywhere).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles — one row per auth user. `name` is the only publicly exposed column
-- (via the public_profiles view in migration 2). `is_admin` gates admin tools.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text,
  prefs      jsonb       not null default '{}'::jsonb,
  is_admin   boolean     not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_name_len check (name is null or char_length(name) between 1 and 80)
);

alter table public.profiles add column if not exists name       text;
alter table public.profiles add column if not exists prefs      jsonb       not null default '{}'::jsonb;
alter table public.profiles add column if not exists is_admin   boolean     not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- saved_cocktails — a user's collection ("save this cocktail"). One row per
-- (user, cocktail). Capped per user by the enforce_saves_cap trigger.
-- ----------------------------------------------------------------------------
create table if not exists public.saved_cocktails (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  cocktail_id text        not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, cocktail_id)
);

alter table public.saved_cocktails add column if not exists created_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- made_cocktails — the "passport" / retention progress: a user marking a
-- cocktail as made. One row per (user, cocktail).
-- ----------------------------------------------------------------------------
create table if not exists public.made_cocktails (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  cocktail_id text        not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, cocktail_id)
);

alter table public.made_cocktails add column if not exists created_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- reviews — rating (1-5) + optional free-text body, one per user per cocktail.
-- Rate-limited per user/hour by enforce_review_rate_limit.
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  cocktail_id text        not null,
  rating      int         not null,
  body        text,
  created_at  timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_body_len    check (body is null or char_length(body) <= 2000),
  unique (user_id, cocktail_id)
);

alter table public.reviews add column if not exists body       text;
alter table public.reviews add column if not exists created_at timestamptz not null default now();

create index if not exists reviews_cocktail_id_idx on public.reviews (cocktail_id);

-- ----------------------------------------------------------------------------
-- tonight_making — communal "I'm making the featured cocktail this period"
-- counter. Owner-only rows; public counts come from the definer view
-- tonight_making_counts (migration 2), which exposes NO user_id.
-- week_key matches packages/core featured.periodKey(), e.g. "2026-W37".
-- ----------------------------------------------------------------------------
create table if not exists public.tonight_making (
  week_key   text        not null,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (week_key, user_id)
);

alter table public.tonight_making add column if not exists created_at timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- made_photos — moderated user photo submissions. Files live in the PRIVATE
-- `made-photos` storage bucket. The enforce_made_photo_insert trigger forces
-- status='pending', validates storage_path begins with '<uid>/', and sets
-- user_name server-side from the profile (client cannot spoof it).
-- ----------------------------------------------------------------------------
create table if not exists public.made_photos (
  id           uuid primary key default gen_random_uuid(),
  week_key     text        not null,
  cocktail_id  text        not null,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  user_name    text,
  storage_path text        not null,
  caption      text,
  status       text        not null default 'pending',
  created_at   timestamptz not null default now(),
  approved_at  timestamptz,
  constraint made_photos_caption_len check (caption is null or char_length(caption) <= 200),
  constraint made_photos_status_chk  check (status in ('pending', 'approved', 'rejected'))
);

alter table public.made_photos add column if not exists user_name   text;
alter table public.made_photos add column if not exists caption     text;
alter table public.made_photos add column if not exists status      text not null default 'pending';
alter table public.made_photos add column if not exists created_at  timestamptz not null default now();
alter table public.made_photos add column if not exists approved_at timestamptz;

create index if not exists made_photos_status_idx   on public.made_photos (status);
create index if not exists made_photos_week_key_idx on public.made_photos (week_key);
create index if not exists made_photos_user_id_idx  on public.made_photos (user_id);

-- ----------------------------------------------------------------------------
-- subscribers — double opt-in newsletter list. `token` is a per-subscriber
-- secret used to build confirm/unsubscribe links (server-only; there is NO
-- select policy in migration 2, so the list is never anon-readable).
-- `confirm_sent_at` rate-limits confirmation resends.
-- ----------------------------------------------------------------------------
create table if not exists public.subscribers (
  email           text primary key,
  source          text,
  confirmed       boolean     not null default false,
  unsubscribed    boolean     not null default false,
  confirmed_at    timestamptz,
  token           uuid        not null default gen_random_uuid(),
  confirm_sent_at timestamptz,
  created_at      timestamptz not null default now(),
  constraint subscribers_email_len check (char_length(email) <= 320)
);

alter table public.subscribers add column if not exists source          text;
alter table public.subscribers add column if not exists confirmed       boolean     not null default false;
alter table public.subscribers add column if not exists unsubscribed    boolean     not null default false;
alter table public.subscribers add column if not exists confirmed_at    timestamptz;
alter table public.subscribers add column if not exists token           uuid        not null default gen_random_uuid();
alter table public.subscribers add column if not exists confirm_sent_at timestamptz;
alter table public.subscribers add column if not exists created_at      timestamptz not null default now();

-- ----------------------------------------------------------------------------
-- newsletter_log — idempotency ledger for the broadcast job. RLS on, NO policy
-- (migration 2) => service-role only. The send job "claims" a week_key here
-- BEFORE sending so a re-run can't double-send.
-- ----------------------------------------------------------------------------
create table if not exists public.newsletter_log (
  week_key text primary key,
  sent_at  timestamptz,
  count    int
);

alter table public.newsletter_log add column if not exists sent_at timestamptz;
alter table public.newsletter_log add column if not exists count   int;

-- ----------------------------------------------------------------------------
-- Admin / operations tables (admin-only, except text_overrides which is
-- public-read / admin-write).
-- ----------------------------------------------------------------------------

-- cocktail_notes — internal QA verdict per cocktail (good | issue) + notes.
create table if not exists public.cocktail_notes (
  cocktail_id text primary key,
  verdict     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cocktail_notes_verdict_chk check (verdict is null or verdict in ('good', 'issue'))
);

alter table public.cocktail_notes add column if not exists verdict    text;
alter table public.cocktail_notes add column if not exists notes      text;
alter table public.cocktail_notes add column if not exists created_at timestamptz not null default now();
alter table public.cocktail_notes add column if not exists updated_at timestamptz not null default now();

-- image_notes — per-cocktail image-prompt notes that survive regen cycles.
create table if not exists public.image_notes (
  cocktail_id text primary key,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.image_notes add column if not exists notes      text;
alter table public.image_notes add column if not exists created_at timestamptz not null default now();
alter table public.image_notes add column if not exists updated_at timestamptz not null default now();

-- text_overrides — live copy edits: opaque key -> value (jsonb). PUBLIC-READ,
-- admin-write; baked into the next static build.
create table if not exists public.text_overrides (
  key        text primary key,
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.text_overrides add column if not exists value      jsonb       not null default '{}'::jsonb;
alter table public.text_overrides add column if not exists updated_at timestamptz not null default now();
