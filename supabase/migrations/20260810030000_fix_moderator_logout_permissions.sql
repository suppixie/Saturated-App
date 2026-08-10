-- Public catalogue and review policies call is_moderator() while evaluating
-- anonymous reads. The helper is security-definer, has a locked search path,
-- and returns false when auth.uid() is null, so anonymous execute permission is
-- safe and required for signed-out browsing and logout transitions.

revoke all on function public.is_moderator(uuid) from public;
revoke all on function public.users_blocked(uuid, uuid) from public;
grant execute on function public.is_moderator(uuid) to anon, authenticated;
grant execute on function public.users_blocked(uuid, uuid) to anon, authenticated;
