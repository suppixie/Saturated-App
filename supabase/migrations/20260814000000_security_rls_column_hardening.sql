-- Security hardening: close the anonymous PII leak + stop self-service
-- privilege escalation. Addresses P0 findings from the pre-launch review.
--
-- DESIGN CONSTRAINT: this must not break the shipping client. Verified against
-- lib/database.ts before writing:
--   * the app SELECTs date_of_birth (4 call sites) -> authenticated keeps it
--   * the app UPDATEs display_name, username, bio, avatar_url (updateProfile)
--     and date_of_birth, birth_verified_at (age verification) -> all kept
--   * the app never writes is_suspended / terms_accepted_at from the client
--     (terms go through accept_community_terms(); suspension is moderator-only)
-- So the grants below are exactly "what the app legitimately writes", nothing more.

-- ─────────────────────────────────────────────────────────────────────────────
-- P0-A: date_of_birth is readable by ANYONE on the internet.
--
-- profiles has a "publicly readable TO anon" policy, and the publishable key is
-- (correctly) public in the repo -- so an unauthenticated caller can list every
-- profile and read raw dates of birth. Verified live against the project.
--
-- Fix: anon keeps read access to the columns the app/policies actually need
-- (other RLS policies contain inline `select ... from profiles where
-- is_suspended` subqueries, so anon must retain those columns or review reads
-- break), but LOSES date_of_birth. authenticated is unchanged, so the client
-- keeps working exactly as today.
--
-- FOLLOW-UP (separate PR, needs client changes): stop persisting raw DOB
-- altogether and keep only birth_verified_at. Minimising beats guarding.
revoke select on public.profiles from anon;
grant select (
  id, username, display_name, bio, avatar_url,
  birth_verified_at, terms_accepted_at, is_suspended,
  created_at, updated_at
) on public.profiles to anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- P0-B: any user can edit the moderation flags on their own row.
--
-- RLS restricts WHICH ROW a user may update (their own) but never WHICH COLUMNS,
-- and `grant update on <table>` covers every column. Net effect today:
--   * a suspended user can PATCH is_suspended = false and un-ban themselves
--   * an author can PATCH is_hidden = false and un-hide a moderated review
--     or comment
-- No exploit required -- it is the same profile/review edit the app already
-- offers. This silently defeats the moderation system.
--
-- Fix: replace table-wide UPDATE with column-scoped UPDATE covering exactly the
-- user-owned content. Moderation/system columns (is_suspended, is_hidden,
-- hidden_at, terms_accepted_at) become writable only by SECURITY DEFINER
-- functions and the service role.
revoke update on public.profiles from authenticated;
grant update (
  username, display_name, bio, avatar_url,
  date_of_birth, birth_verified_at, updated_at
) on public.profiles to authenticated;

revoke update on public.reviews from authenticated;
grant update (rating, body, updated_at) on public.reviews to authenticated;

revoke update on public.review_comments from authenticated;
grant update (body, updated_at) on public.review_comments to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- P0-C: save_review() resurrects moderator-hidden reviews.
--
-- The ON CONFLICT branch reset is_hidden = false / hidden_at = null on every
-- upsert. Because authors are never told their review was hidden, this fires on
-- ordinary edits: a moderator hides a review, the author fixes a typo, and the
-- review is public again -- no intent, no notification to anyone.
--
-- Fix: preserve moderation state across updates. New reviews still insert
-- is_hidden = false via the INSERT values, so first-time posting is unchanged.
create or replace function public.save_review(
  target_beverage_id text,
  review_rating numeric,
  review_body text,
  review_tags text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  saved_review_id uuid;
  normalized_tag text;
  saved_tag_id bigint;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = current_user_id
      and terms_accepted_at is not null
      and not is_suspended
  ) then
    raise exception 'Accept the Community Guidelines before posting';
  end if;
  if not exists (
    select 1 from public.beverages
    where id = target_beverage_id and is_published
  ) then
    raise exception 'Beverage not found';
  end if;
  if review_rating < 0.5 or review_rating > 5 or mod(review_rating * 2, 1) <> 0 then
    raise exception 'Rating must be between 0.5 and 5 in half-star steps';
  end if;
  if length(trim(review_body)) = 0 then
    raise exception 'Review text is required';
  end if;

  insert into public.reviews (beverage_id, user_id, rating, body, is_hidden, hidden_at)
  values (target_beverage_id, current_user_id, review_rating, trim(review_body), false, null)
  on conflict (beverage_id, user_id) do update
  set rating = excluded.rating,
      body = excluded.body,
      -- is_hidden / hidden_at deliberately NOT reset: an edit must never
      -- resurrect a review a moderator has hidden.
      updated_at = timezone('utc', now())
  returning id into saved_review_id;

  delete from public.review_flavour_tags where review_id = saved_review_id;
  foreach normalized_tag in array coalesce(review_tags, '{}'::text[])
  loop
    normalized_tag := initcap(trim(normalized_tag));
    if normalized_tag <> '' then
      insert into public.flavour_tags (name, created_by)
      values (normalized_tag, current_user_id)
      on conflict (name) do update set name = excluded.name
      returning id into saved_tag_id;
      insert into public.review_flavour_tags (review_id, flavour_tag_id)
      values (saved_review_id, saved_tag_id)
      on conflict do nothing;
    end if;
  end loop;

  delete from public.drinklist
  where user_id = current_user_id and beverage_id = target_beverage_id;
  perform public.refresh_my_badges();
  return saved_review_id;
end;
$$;
