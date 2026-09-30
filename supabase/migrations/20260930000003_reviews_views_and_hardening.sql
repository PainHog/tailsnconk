-- ============================================================================
-- Migration 3 — public read paths for reviews/ratings + security hardening.
--
-- Fixes surfaced by the code audit:
--   * public_reviews          — anon-readable joined view so the reviews list
--                               and on-page ratings actually populate (the app
--                               can't read the reviews table directly: RLS only
--                               exposes the caller's own rows).
--   * cocktail_rating_aggregates — the view fetch-ratings.mjs bakes at build
--                               time (was missing -> empty stars + no
--                               aggregateRating JSON-LD).
--   * public_profiles         — restricted to users who actually have public
--                               content (no full-membership enumeration).
--   * subscribers token       — a trigger mints the token server-side so an
--                               anon insert can't choose a victim's token and
--                               self-confirm (double-opt-in bypass).
--
-- Idempotent: `create or replace view`, `drop ... if exists` then `create`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- public_reviews — definer view (owned by the migration role) that reads past
-- reviews RLS and joins the author's public display name. Read-only, anon-safe:
-- reviews are public community content; this exposes no email or admin flag.
-- ----------------------------------------------------------------------------
create or replace view public.public_reviews as
  select
    r.id,
    r.user_id,
    r.cocktail_id,
    r.rating,
    r.body,
    r.created_at,
    coalesce(p.name, 'Guest') as name
  from public.reviews r
  left join public.profiles p on p.user_id = r.user_id;

revoke all on public.public_reviews from public;
grant select on public.public_reviews to anon, authenticated;

-- ----------------------------------------------------------------------------
-- cocktail_rating_aggregates — per-cocktail average + count, shaped exactly as
-- apps/mobile/scripts/fetch-ratings.mjs expects: (slug, rating_value,
-- review_count). Definer view, so it aggregates all rows past reviews RLS.
-- ----------------------------------------------------------------------------
create or replace view public.cocktail_rating_aggregates as
  select
    cocktail_id                    as slug,
    round(avg(rating)::numeric, 2) as rating_value,
    count(*)::bigint               as review_count
  from public.reviews
  group by cocktail_id;

revoke all on public.cocktail_rating_aggregates from public;
grant select on public.cocktail_rating_aggregates to anon, authenticated;

-- ----------------------------------------------------------------------------
-- public_profiles — tighten: only surface a display name for users who have
-- public content (a review or an approved photo), so the view can't be used to
-- enumerate the entire membership list.
-- ----------------------------------------------------------------------------
create or replace view public.public_profiles as
  select p.user_id, p.name
  from public.profiles p
  where exists (select 1 from public.reviews r where r.user_id = p.user_id)
     or exists (
       select 1 from public.made_photos m
       where m.user_id = p.user_id and m.status = 'approved'
     );

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

-- ----------------------------------------------------------------------------
-- subscribers — force the per-subscriber token server-side on any non-service
-- insert. Without this an anon caller could INSERT (victim_email, chosen_token)
-- and then confirm it via newsletter-confirm using the token they picked. The
-- service-role newsletter-subscribe function is exempt so it keeps control of
-- the token it emails.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_subscriber_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.token       := gen_random_uuid();
    new.confirmed   := false;
    new.unsubscribed := false;
    new.confirm_sent_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists subscribers_force_token on public.subscribers;
create trigger subscribers_force_token
  before insert on public.subscribers
  for each row execute function public.enforce_subscriber_insert();
