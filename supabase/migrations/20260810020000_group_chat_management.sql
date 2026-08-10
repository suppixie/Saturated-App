create table if not exists public.group_chat_reports (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_chats(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'other',
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists group_chat_reports_status_idx
  on public.group_chat_reports (status, created_at desc);

alter table public.group_chat_reports enable row level security;

drop policy if exists "Users can report groups" on public.group_chat_reports;
create policy "Users can report groups"
  on public.group_chat_reports for insert to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "Users can read their group reports" on public.group_chat_reports;
create policy "Users can read their group reports"
  on public.group_chat_reports for select to authenticated
  using (reporter_id = auth.uid());

create or replace function public.leave_group_chat(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists (
    select 1 from public.group_chats
    where id = target_group_id and owner_id = auth.uid()
  ) then
    raise exception 'Group owners cannot leave their own group';
  end if;
  delete from public.group_chat_members
  where group_id = target_group_id and user_id = auth.uid();
end;
$$;

create or replace function public.list_group_chat_members(target_group_id uuid)
returns table (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  is_owner boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profile.id,
    profile.display_name,
    profile.username,
    profile.avatar_url,
    groups.owner_id = profile.id as is_owner
  from public.group_chat_members membership
  join public.profiles profile on profile.id = membership.user_id
  join public.group_chats groups on groups.id = membership.group_id
  where membership.group_id = target_group_id
    and auth.uid() is not null
    and (
      groups.visibility = 'public'
      or groups.owner_id = auth.uid()
      or exists (
        select 1 from public.group_chat_members viewer
        where viewer.group_id = groups.id and viewer.user_id = auth.uid()
      )
    )
  order by (groups.owner_id = profile.id) desc, membership.joined_at asc;
$$;

grant execute on function public.leave_group_chat(uuid) to authenticated;
grant execute on function public.list_group_chat_members(uuid) to authenticated;
grant select, insert on public.group_chat_reports to authenticated;
