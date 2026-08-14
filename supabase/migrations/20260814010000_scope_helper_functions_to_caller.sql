-- Stop is_moderator() / users_blocked() from answering questions about OTHER
-- people over HTTP.
--
-- PROBLEM
-- 20260810030000_fix_moderator_logout_permissions.sql granted EXECUTE on both
-- helpers to `anon`. PostgREST publishes every function in `public`, so an
-- unauthenticated caller can hit:
--     POST /rest/v1/rpc/is_moderator   {"check_user_id": "<any uuid>"}
--     POST /rest/v1/rpc/users_blocked  {"first_user_id": …, "second_user_id": …}
-- Both were verified answering truthfully against the live project. Profiles are
-- enumerable, so the moderator roster and the entire who-blocked-whom graph can
-- be reconstructed without an account. Block relationships are safety data.
--
-- APPROACH
-- The endpoints are not the problem; answering about third parties is. Every
-- legitimate caller only ever asks about itself:
--   * all 13 RLS policies call is_moderator() with no argument
--   * resolve_content_report() calls is_moderator(auth.uid())
--   * the moderation_queue view calls is_moderator()
--   * the client calls rpc("is_moderator") with no argument (lib/database.ts)
--   * all three policies call users_blocked((select auth.uid()), <column>)
-- so scoping both functions to the caller is behaviour-preserving.
--
-- Rejected alternative: moving both into a non-exposed `private` schema. It
-- removes the endpoints, but the signatures are referenced by the
-- moderation_queue view, resolve_content_report(), and the client's RPC call --
-- so it requires dropping and recreating a view, a function, and 13 policies.
-- Far more surface area for an error, for the same security outcome. Revoking
-- EXECUTE from anon was also rejected: RLS policy expressions are evaluated with
-- the caller's privileges, so logged-out reads would break -- exactly the
-- regression 20260810030000 was fixing.

-- ── is_moderator: always answers for the caller, parameter ignored ───────────
-- Signature kept (including the default) so the view, resolve_content_report(),
-- every policy and the client RPC keep resolving to it unchanged.
create or replace function public.is_moderator(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- check_user_id is deliberately unused: this function reports only on the
  -- authenticated caller. Passing someone else's id returns the caller's own
  -- status, never theirs. Anonymous callers always get false.
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('moderator', 'admin')
  );
$$;

comment on function public.is_moderator(uuid) is
  'Returns whether the AUTHENTICATED CALLER is a moderator/admin. The argument '
  'is ignored by design -- this function must never disclose another user''s '
  'role, because PostgREST exposes it as a public RPC endpoint.';

-- ── users_blocked: only answers when the caller is one of the two parties ────
create or replace function public.users_blocked(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when first_user_id is null or second_user_id is null then false
    -- Anonymous callers, and authenticated callers asking about two other
    -- people, learn nothing. Every in-app call passes auth.uid() as one side,
    -- so this guard never trips for legitimate use.
    when auth.uid() is null then false
    when auth.uid() <> first_user_id and auth.uid() <> second_user_id then false
    else exists (
      select 1
      from public.user_blocks
      where (blocker_id = first_user_id and blocked_id = second_user_id)
         or (blocker_id = second_user_id and blocked_id = first_user_id)
    )
  end;
$$;

comment on function public.users_blocked(uuid, uuid) is
  'Returns whether two users have blocked each other, but ONLY when the '
  'authenticated caller is one of them. Third-party and anonymous probes return '
  'false, because PostgREST exposes this as a public RPC endpoint and the block '
  'graph is safety-sensitive.';

-- Grants unchanged: both remain EXECUTE-able by anon and authenticated because
-- RLS policies call them during logged-out reads.
