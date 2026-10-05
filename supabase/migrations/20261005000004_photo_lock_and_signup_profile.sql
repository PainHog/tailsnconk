-- ============================================================================
-- Migration 4 — lock submitted photo files + create profiles at sign-up.
--
-- Fixes surfaced by the 2026-10-05 backend audit:
--   * made-photos storage — the owner-update policy let a user overwrite the
--                           file behind an already-approved photo, so an
--                           unreviewed image reached the wall. Files are now
--                           write-once: no in-place update, and once a
--                           made_photos row points at a file the owner can't
--                           replace it (a delete + re-upload to the same path
--                           is blocked too). A replacement photo is a new
--                           upload + new row, which goes back through review.
--   * profiles            — sign-up with email confirmation returns no session,
--                           so the client's profile upsert is blocked by RLS.
--                           An AFTER INSERT trigger on auth.users now creates
--                           the profile server-side, and existing users with
--                           no profile are backfilled.
--
-- Idempotent: `drop ... if exists` then `create`, `create or replace`,
-- `on conflict do nothing`.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. made-photos objects are write-once.
--
-- The policy subqueries read public.made_photos as the caller, so RLS limits
-- them to the caller's own rows — which is all that matters here, because the
-- folder check already pins the object to the caller and
-- enforce_made_photo_insert pins every row's storage_path to its owner's
-- folder. Admins keep full access through made_photos_obj_admin_all.
-- ----------------------------------------------------------------------------

-- No in-place overwrite, ever (this also makes upload(..., { upsert: true })
-- fail for non-admins, since an upsert needs UPDATE).
drop policy if exists made_photos_obj_update_own on storage.objects;

-- Upload only to a path no photo submission references yet. Without this a
-- user could delete an approved photo's file and upload a new one at the same
-- path.
drop policy if exists made_photos_obj_insert_own on storage.objects;
create policy made_photos_obj_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'made-photos'
              and (storage.foldername(name))[1] = auth.uid()::text
              and not exists (
                select 1 from public.made_photos m
                where m.storage_path = storage.objects.name
              ));

-- Delete only files that are not behind an approved photo. To take an
-- approved photo down the owner deletes its made_photos row first (allowed by
-- made_photos_delete_own), which removes it from the wall; the file can then
-- be deleted.
drop policy if exists made_photos_obj_delete_own on storage.objects;
create policy made_photos_obj_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'made-photos'
         and (storage.foldername(name))[1] = auth.uid()::text
         and not exists (
           select 1 from public.made_photos m
           where m.storage_path = storage.objects.name
             and m.status = 'approved'
         ));

-- ----------------------------------------------------------------------------
-- 2. handle_new_user() — AFTER INSERT on auth.users. Creates the profile from
-- the name given at sign-up (raw_user_meta_data.name), trimmed and capped to
-- the profiles_name_len limit. With no usable name it falls back to the
-- neutral 'Guest' — never the email or any part of it.
--
-- SECURITY DEFINER so it can write profiles regardless of the inserting role;
-- empty search_path so every reference is schema-qualified. Not callable by
-- clients: EXECUTE is revoked from public AND from anon/authenticated, which
-- Supabase grants on new functions through default privileges.
-- ----------------------------------------------------------------------------
create or replace function public.profile_name_from_signup(meta jsonb, email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
begin
  v := left(nullif(btrim(coalesce(meta ->> 'name', '')), ''), 80);
  -- Someone who typed their email address as their name still gets the
  -- neutral default, so an email never becomes a public display name.
  if v is null
     or (email is not null and lower(v) = lower(email)) then
    return 'Guest';
  end if;
  return v;
end;
$$;

revoke all on function public.profile_name_from_signup(jsonb, text) from public;
revoke all on function public.profile_name_from_signup(jsonb, text) from anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, public.profile_name_from_signup(new.raw_user_meta_data, new.email))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. Backfill: every existing user without a profile gets one, named the same
-- way as above (sign-up name or 'Guest'; never the email).
-- ----------------------------------------------------------------------------
insert into public.profiles (user_id, name)
select u.id, public.profile_name_from_signup(u.raw_user_meta_data, u.email)
from auth.users u
where not exists (select 1 from public.profiles p where p.user_id = u.id)
on conflict (user_id) do nothing;
