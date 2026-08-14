-- Stop storing date of birth; enforce the 18+ check server-side.
--
-- PROBLEM 1 (privacy)
-- profiles.date_of_birth holds a raw DOB, and it is also mirrored into
-- auth.users.raw_user_meta_data at signup. Nothing in the product reads it --
-- the only question ever asked is "is this account 18+", which
-- profiles.birth_verified_at already answers. Storing and replicating a
-- birthdate is unnecessary personal data under GDPR.
--
-- PROBLEM 2 (security)
-- birth_verified_at was writable by the client (granted in
-- 20260814000000_security_rls_column_hardening.sql because the app set it
-- directly), so an account could assert it was of age without any check. The
-- existing enforce_profile_minimum_age trigger only fired on date_of_birth,
-- which the client also controlled.
--
-- FIX
-- The DOB is still collected at signup and still checked -- but the check now
-- happens in the database, from signup metadata, and the value is discarded
-- immediately rather than persisted. Under-18 signups are rejected as before.

-- ── 1. verification happens in handle_new_user, from metadata, without storing ─
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplied_birth_date date := public.profile_birth_date(new.raw_user_meta_data);
  supplied_username text := nullif(new.raw_user_meta_data ->> 'username', '');
begin
  -- Server-side age gate. Previously the client decided this by writing
  -- birth_verified_at itself; now the database is the only thing that can.
  if supplied_birth_date is not null
     and supplied_birth_date > current_date - interval '18 years' then
    raise exception 'You must be 18+ to use this app.' using errcode = '22023';
  end if;

  insert into public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    birth_verified_at
  )
  values (
    new.id,
    -- Collision fix: route supplied usernames through the same availability
    -- walk already used for generated ones. Previously a supplied username was
    -- inserted raw, so a duplicate raised a UNIQUE violation inside this
    -- auth.users trigger and surfaced to the client as a raw HTTP 500.
    public.available_profile_username(supplied_username, new.email, new.id),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      'Saturated User'
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    -- Only the attestation is kept. The DOB itself is never written.
    case when supplied_birth_date is not null then timezone('utc', now()) end
  )
  on conflict (id) do nothing;

  -- Scrub the DOB from auth metadata now that it has served its purpose.
  update auth.users
     set raw_user_meta_data = raw_user_meta_data - 'date_of_birth'
   where id = new.id
     and raw_user_meta_data ? 'date_of_birth';

  return new;
end;
$$;

-- ── 2. birth_verified_at is no longer client-writable ────────────────────────
-- Re-grants the column list from 20260814000000 minus birth_verified_at and
-- date_of_birth. Age verification now happens only in handle_new_user.
revoke update on public.profiles from authenticated;
grant update (username, display_name, bio, avatar_url, updated_at)
  on public.profiles to authenticated;

-- ── 3. retire the column and its now-dead trigger ────────────────────────────
drop trigger if exists profiles_enforce_minimum_age on public.profiles;
drop function if exists public.enforce_profile_minimum_age();

alter table public.profiles drop column if exists date_of_birth;

-- Purge any DOB still sitting in auth metadata from earlier signups.
update auth.users
   set raw_user_meta_data = raw_user_meta_data - 'date_of_birth'
 where raw_user_meta_data ? 'date_of_birth';

-- profile_birth_date() is retained: handle_new_user still parses the DOB from
-- metadata in order to check it. It is a pure parser and stores nothing.

-- ── 4. OAuth age verification, server-side ───────────────────────────────────
-- Google/Apple signups carry no date of birth in their metadata, so the app
-- collects it after the session exists and previously wrote both date_of_birth
-- and birth_verified_at directly (updateCurrentDateOfBirth in lib/database.ts).
-- That path is now closed by the grant above, so it is replaced with an RPC
-- that performs the check in the database and keeps only the attestation.
create or replace function public.verify_age(birth_date date)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  verified_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if birth_date is null then
    raise exception 'A date of birth is required.' using errcode = '22023';
  end if;
  if birth_date > current_date then
    raise exception 'That date is in the future.' using errcode = '22023';
  end if;
  if birth_date > current_date - interval '18 years' then
    raise exception 'You must be 18+ to use this app.' using errcode = '22023';
  end if;

  verified_at := timezone('utc', now());
  -- Only the attestation is persisted; birth_date is discarded with the call.
  update public.profiles
     set birth_verified_at = coalesce(birth_verified_at, verified_at)
   where id = auth.uid();

  return verified_at;
end;
$$;

revoke all on function public.verify_age(date) from public, anon;
grant execute on function public.verify_age(date) to authenticated;

comment on function public.verify_age(date) is
  'Server-side 18+ check for OAuth signups. Verifies the supplied date, records '
  'only birth_verified_at for the calling user, and never stores the date '
  'itself. Replaces the client-side write, which allowed self-asserted age.';
