-- ============================================================================
-- tailsnconk — RLS, policies, functions, triggers, views, storage
-- ----------------------------------------------------------------------------
-- Migration 2 of 2. Depends on the tables from 20260909000001_schema.sql.
--
-- Idempotent by design:
--   * functions      -> `create or replace function`
--   * RLS enable      -> `alter table ... enable row level security` (re-runnable)
--   * policies        -> `drop policy if exists` then `create policy`
--   * triggers        -> `drop trigger if exists` then `create trigger`
--   * views           -> `create or replace view`
--   * storage bucket  -> `insert ... on conflict do update`
--
-- RLS model:
--   * owner-only tables: auth.uid() = user_id on select/insert/delete, WITH
--     CHECK on update.
--   * public aggregate DEFINER views over private rows (no user_id exposed).
--   * narrow public projection view (name only) over an owner-private base.
--   * service-role-only tables: RLS on, NO policy.
-- ============================================================================


-- ============================================================================
-- 1. Access-control primitives / helper functions
-- ============================================================================

-- is_admin() — SECURITY DEFINER read of profiles.is_admin for the caller.
-- Runs as the function owner so it bypasses profiles RLS (no recursion) and can
-- be called from within every admin policy.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.user_id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- guard_admin_flag() — BEFORE UPDATE on profiles. Stops a user from granting
-- themselves admin: a non-admin's attempt to change is_admin is silently
-- reverted to the previously-committed value.
create or replace function public.guard_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

-- enforce_saves_cap() — BEFORE INSERT on saved_cocktails. Caps saves per user.
create or replace function public.enforce_saves_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cap constant int := 500;
  n   int;
begin
  select count(*) into n from public.saved_cocktails where user_id = new.user_id;
  if n >= cap then
    raise exception 'saved cocktails limit reached (max % per user)', cap
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- enforce_review_rate_limit() — BEFORE INSERT on reviews. Caps reviews per
-- user per rolling hour.
create or replace function public.enforce_review_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  max_per_hour constant int := 10;
  n            int;
begin
  select count(*) into n
  from public.reviews
  where user_id = new.user_id
    and created_at > now() - interval '1 hour';
  if n >= max_per_hour then
    raise exception 'review rate limit exceeded (max % per hour)', max_per_hour
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- enforce_made_photo_insert() — BEFORE INSERT on made_photos. Forces the row
-- into a safe state that the client cannot spoof:
--   * status is always 'pending' (no self-approval); approved_at cleared.
--   * user_id must equal the authenticated caller.
--   * storage_path must begin with '<uid>/'.
--   * user_name is copied server-side from the caller's profile.
--   * pending uploads per user are capped.
create or replace function public.enforce_made_photo_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pending_cap constant int := 10;
  n           int;
  pname       text;
begin
  -- Never trust client-supplied moderation state.
  new.status := 'pending';
  new.approved_at := null;

  -- The row must belong to the caller.
  if new.user_id is distinct from auth.uid() then
    raise exception 'user_id must match the authenticated user'
      using errcode = 'check_violation';
  end if;

  -- Storage path is bound to the caller's own folder: "<uid>/...".
  if new.storage_path is null
     or position((new.user_id::text || '/') in new.storage_path) <> 1 then
    raise exception 'storage_path must begin with "<uid>/"'
      using errcode = 'check_violation';
  end if;

  -- Denormalized display name is set server-side (client cannot spoof it).
  select p.name into pname from public.profiles p where p.user_id = new.user_id;
  new.user_name := pname;

  -- Abuse bound: limit outstanding pending uploads per user.
  select count(*) into n
  from public.made_photos
  where user_id = new.user_id and status = 'pending';
  if n >= pending_cap then
    raise exception 'too many pending photo uploads (max %)', pending_cap
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- subscriber_stats() — SECURITY DEFINER admin-only counts (never exposes rows
-- or emails). execute revoked from public, granted to authenticated; the
-- function itself checks is_admin() so a non-admin authenticated call fails.
create or replace function public.subscriber_stats()
returns table (total bigint, confirmed bigint, unsubscribed bigint, pending bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      count(*)::bigint,
      count(*) filter (where confirmed and not unsubscribed)::bigint,
      count(*) filter (where unsubscribed)::bigint,
      count(*) filter (where not confirmed and not unsubscribed)::bigint
    from public.subscribers;
end;
$$;

revoke all on function public.subscriber_stats() from public;
grant execute on function public.subscriber_stats() to authenticated;

-- tg_set_updated_at() — generic BEFORE UPDATE touch for updated_at columns.
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ============================================================================
-- 2. Enable Row-Level Security on every application table
-- ============================================================================
alter table public.profiles        enable row level security;
alter table public.saved_cocktails enable row level security;
alter table public.made_cocktails  enable row level security;
alter table public.reviews         enable row level security;
alter table public.tonight_making  enable row level security;
alter table public.made_photos     enable row level security;
alter table public.subscribers     enable row level security;
alter table public.newsletter_log  enable row level security;
alter table public.cocktail_notes  enable row level security;
alter table public.image_notes     enable row level security;
alter table public.text_overrides  enable row level security;


-- ============================================================================
-- 3. Policies (drop-then-create so re-running is safe)
-- ============================================================================

-- ---- profiles: owner-private; admins may read all ----
drop policy if exists profiles_select_own   on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

drop policy if exists profiles_insert_own   on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists profiles_update_own   on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- saved_cocktails: owner-only ----
drop policy if exists saved_cocktails_select_own on public.saved_cocktails;
create policy saved_cocktails_select_own on public.saved_cocktails
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists saved_cocktails_insert_own on public.saved_cocktails;
create policy saved_cocktails_insert_own on public.saved_cocktails
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists saved_cocktails_delete_own on public.saved_cocktails;
create policy saved_cocktails_delete_own on public.saved_cocktails
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---- made_cocktails: owner-only ----
drop policy if exists made_cocktails_select_own on public.made_cocktails;
create policy made_cocktails_select_own on public.made_cocktails
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists made_cocktails_insert_own on public.made_cocktails;
create policy made_cocktails_insert_own on public.made_cocktails
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists made_cocktails_delete_own on public.made_cocktails;
create policy made_cocktails_delete_own on public.made_cocktails
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---- reviews: owner-only writes/reads; admins may read all for moderation.
-- Public display of reviews/aggregate ratings is produced at build time by the
-- service role (packages/core baked snapshots), not via anon table reads. ----
drop policy if exists reviews_select_own   on public.reviews;
create policy reviews_select_own on public.reviews
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists reviews_select_admin on public.reviews;
create policy reviews_select_admin on public.reviews
  for select to authenticated
  using (public.is_admin());

drop policy if exists reviews_insert_own   on public.reviews;
create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists reviews_update_own   on public.reviews;
create policy reviews_update_own on public.reviews
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists reviews_delete_own   on public.reviews;
create policy reviews_delete_own on public.reviews
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---- tonight_making: owner-only rows; public counts via definer view ----
drop policy if exists tonight_making_select_own on public.tonight_making;
create policy tonight_making_select_own on public.tonight_making
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists tonight_making_insert_own on public.tonight_making;
create policy tonight_making_insert_own on public.tonight_making
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists tonight_making_delete_own on public.tonight_making;
create policy tonight_making_delete_own on public.tonight_making
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---- made_photos: owner reads/inserts own; admins moderate; public reads are
-- served only as signed URLs for APPROVED rows via the wall-photos function. ----
drop policy if exists made_photos_select_own   on public.made_photos;
create policy made_photos_select_own on public.made_photos
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists made_photos_select_admin on public.made_photos;
create policy made_photos_select_admin on public.made_photos
  for select to authenticated
  using (public.is_admin());

drop policy if exists made_photos_insert_own   on public.made_photos;
create policy made_photos_insert_own on public.made_photos
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Only admins change moderation state (approve/reject).
drop policy if exists made_photos_update_admin on public.made_photos;
create policy made_photos_update_admin on public.made_photos
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists made_photos_delete_own   on public.made_photos;
create policy made_photos_delete_own on public.made_photos
  for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists made_photos_delete_admin on public.made_photos;
create policy made_photos_delete_admin on public.made_photos
  for delete to authenticated
  using (public.is_admin());

-- ---- subscribers: anon may INSERT only an unconfirmed, non-unsubscribed row.
-- No select/update/delete policy => never anon-readable; confirmation and
-- unsubscribe are flipped server-side by the service role. ----
drop policy if exists subscribers_insert_public on public.subscribers;
create policy subscribers_insert_public on public.subscribers
  for insert to anon, authenticated
  with check (confirmed = false and unsubscribed = false);

-- ---- newsletter_log: RLS on, NO policy => service-role only. ----

-- ---- cocktail_notes: admin-only ----
drop policy if exists cocktail_notes_all_admin on public.cocktail_notes;
create policy cocktail_notes_all_admin on public.cocktail_notes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- image_notes: admin-only ----
drop policy if exists image_notes_all_admin on public.image_notes;
create policy image_notes_all_admin on public.image_notes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- text_overrides: public-read, admin-write ----
drop policy if exists text_overrides_select_public on public.text_overrides;
create policy text_overrides_select_public on public.text_overrides
  for select to anon, authenticated
  using (true);

drop policy if exists text_overrides_write_admin on public.text_overrides;
create policy text_overrides_write_admin on public.text_overrides
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ============================================================================
-- 4. Triggers
-- ============================================================================
drop trigger if exists trg_guard_admin_flag on public.profiles;
create trigger trg_guard_admin_flag
  before update on public.profiles
  for each row execute function public.guard_admin_flag();

drop trigger if exists trg_enforce_saves_cap on public.saved_cocktails;
create trigger trg_enforce_saves_cap
  before insert on public.saved_cocktails
  for each row execute function public.enforce_saves_cap();

drop trigger if exists trg_enforce_review_rate_limit on public.reviews;
create trigger trg_enforce_review_rate_limit
  before insert on public.reviews
  for each row execute function public.enforce_review_rate_limit();

drop trigger if exists trg_enforce_made_photo_insert on public.made_photos;
create trigger trg_enforce_made_photo_insert
  before insert on public.made_photos
  for each row execute function public.enforce_made_photo_insert();

drop trigger if exists trg_cocktail_notes_updated_at on public.cocktail_notes;
create trigger trg_cocktail_notes_updated_at
  before update on public.cocktail_notes
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_image_notes_updated_at on public.image_notes;
create trigger trg_image_notes_updated_at
  before update on public.image_notes
  for each row execute function public.tg_set_updated_at();

drop trigger if exists trg_text_overrides_updated_at on public.text_overrides;
create trigger trg_text_overrides_updated_at
  before update on public.text_overrides
  for each row execute function public.tg_set_updated_at();


-- ============================================================================
-- 5. Views
-- ============================================================================

-- public_profiles — narrow public projection exposing ONLY (user_id, name).
-- Owned by the migration role (postgres), so it reads past profiles RLS and
-- surfaces display names for review authors etc. without exposing prefs/admin.
create or replace view public.public_profiles as
  select user_id, name
  from public.profiles;

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

-- tonight_making_counts — public aggregate over the owner-only rows. Runs with
-- the view owner's (definer) rights so it bypasses tonight_making RLS, and
-- exposes NO user_id — only (week_key, count).
create or replace view public.tonight_making_counts as
  select week_key, count(*)::bigint as count
  from public.tonight_making
  group by week_key;

revoke all on public.tonight_making_counts from public;
grant select on public.tonight_making_counts to anon, authenticated;


-- ============================================================================
-- 6. Table grants (RLS is the row gate; these grant the operation itself).
-- Explicit and self-contained so the file does not rely on project defaults.
-- ============================================================================

-- Authenticated users operate on their own rows (RLS restricts to owner).
grant select, insert, delete on public.saved_cocktails to authenticated;
grant select, insert, delete on public.made_cocktails  to authenticated;
grant select, insert, delete on public.tonight_making  to authenticated;
grant select, insert, update, delete on public.profiles    to authenticated;
grant select, insert, update, delete on public.reviews     to authenticated;
grant select, insert, update, delete on public.made_photos to authenticated;

-- Admin ops tables (RLS restricts to admins).
grant select, insert, update, delete on public.cocktail_notes to authenticated;
grant select, insert, update, delete on public.image_notes    to authenticated;

-- text_overrides: public read, authenticated (admin-gated) write.
grant select on public.text_overrides to anon, authenticated;
grant insert, update, delete on public.text_overrides to authenticated;

-- subscribers: anon/authenticated may only INSERT (RLS forces unconfirmed).
-- Harden against inherited defaults: the list must never be readable.
revoke all on public.subscribers from anon, authenticated;
grant insert on public.subscribers to anon, authenticated;

-- newsletter_log: service-role only. Strip any inherited access.
revoke all on public.newsletter_log from anon, authenticated;

-- Explicit service_role grants for the tables the edge functions touch with the
-- service-role key (self-contained; does not rely on project default privileges).
-- service_role also bypasses RLS.
grant all on public.subscribers    to service_role;
grant all on public.newsletter_log to service_role;
grant all on public.made_photos    to service_role;


-- ============================================================================
-- 7. Storage: private `made-photos` bucket + object-level RLS
-- ============================================================================

-- Private bucket (public=false), size- and mime-limited. Idempotent upsert.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'made-photos',
  'made-photos',
  false,
  5242880,  -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A user reads/writes ONLY objects under their own "<uid>/..." folder.
drop policy if exists made_photos_obj_select_own on storage.objects;
create policy made_photos_obj_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'made-photos'
         and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists made_photos_obj_insert_own on storage.objects;
create policy made_photos_obj_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'made-photos'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists made_photos_obj_update_own on storage.objects;
create policy made_photos_obj_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'made-photos'
         and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'made-photos'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists made_photos_obj_delete_own on storage.objects;
create policy made_photos_obj_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'made-photos'
         and (storage.foldername(name))[1] = auth.uid()::text);

-- Admins moderate every object in the bucket.
drop policy if exists made_photos_obj_admin_all on storage.objects;
create policy made_photos_obj_admin_all on storage.objects
  for all to authenticated
  using (bucket_id = 'made-photos' and public.is_admin())
  with check (bucket_id = 'made-photos' and public.is_admin());
