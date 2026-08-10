create extension if not exists pgcrypto;

create table if not exists public.group_chats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 60),
  description text not null default '' check (char_length(description) <= 240),
  drink_type text not null default 'Other',
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  invite_code text not null unique default encode(gen_random_bytes(9), 'hex'),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_chat_members (
  group_id uuid not null references public.group_chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_chat_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists group_chats_visibility_type_idx
  on public.group_chats (visibility, drink_type, created_at desc);
create index if not exists group_chat_members_user_idx
  on public.group_chat_members (user_id, joined_at desc);
create index if not exists group_chat_messages_group_idx
  on public.group_chat_messages (group_id, created_at asc);

alter table public.group_chats enable row level security;
alter table public.group_chat_members enable row level security;
alter table public.group_chat_messages enable row level security;

drop policy if exists "Group owners can create groups" on public.group_chats;
create policy "Group owners can create groups"
  on public.group_chats for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Visible groups can be read" on public.group_chats;
create policy "Visible groups can be read"
  on public.group_chats for select to authenticated
  using (
    visibility = 'public'
    or owner_id = auth.uid()
    or exists (
      select 1 from public.group_chat_members membership
      where membership.group_id = group_chats.id
        and membership.user_id = auth.uid()
    )
  );

drop policy if exists "Owners can update groups" on public.group_chats;
create policy "Owners can update groups"
  on public.group_chats for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owners can delete groups" on public.group_chats;
create policy "Owners can delete groups"
  on public.group_chats for delete to authenticated
  using (owner_id = auth.uid());

drop policy if exists "Members can read their memberships" on public.group_chat_members;
create policy "Members can read their memberships"
  on public.group_chat_members for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Members can leave groups" on public.group_chat_members;
create policy "Members can leave groups"
  on public.group_chat_members for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "Visible group messages can be read" on public.group_chat_messages;
create policy "Visible group messages can be read"
  on public.group_chat_messages for select to authenticated
  using (
    exists (
      select 1 from public.group_chats groups
      where groups.id = group_chat_messages.group_id
        and (
          groups.visibility = 'public'
          or groups.owner_id = auth.uid()
          or exists (
            select 1 from public.group_chat_members membership
            where membership.group_id = groups.id
              and membership.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Members can send group messages" on public.group_chat_messages;
create policy "Members can send group messages"
  on public.group_chat_messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.group_chat_members membership
      where membership.group_id = group_chat_messages.group_id
        and membership.user_id = auth.uid()
    )
  );

create or replace function public.add_group_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_chat_members (group_id, user_id)
  values (new.id, new.owner_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists add_group_owner_as_member on public.group_chats;
create trigger add_group_owner_as_member
after insert on public.group_chats
for each row execute function public.add_group_owner_as_member();

create or replace function public.list_group_chats()
returns table (
  id uuid,
  owner_id uuid,
  name text,
  description text,
  drink_type text,
  visibility text,
  invite_code text,
  image_url text,
  member_count bigint,
  joined boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    groups.id,
    groups.owner_id,
    groups.name,
    groups.description,
    groups.drink_type,
    groups.visibility,
    groups.invite_code,
    groups.image_url,
    (select count(*) from public.group_chat_members members where members.group_id = groups.id),
    exists (
      select 1 from public.group_chat_members membership
      where membership.group_id = groups.id and membership.user_id = auth.uid()
    ),
    groups.created_at
  from public.group_chats groups
  where auth.uid() is not null
    and (
      groups.visibility = 'public'
      or groups.owner_id = auth.uid()
      or exists (
        select 1 from public.group_chat_members membership
        where membership.group_id = groups.id and membership.user_id = auth.uid()
      )
    )
  order by groups.created_at desc;
$$;

create or replace function public.join_group_chat(target_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.group_chats
    where id = target_group_id and visibility = 'public'
  ) then
    raise exception 'This group requires an invite';
  end if;
  insert into public.group_chat_members (group_id, user_id)
  values (target_group_id, auth.uid())
  on conflict do nothing;
end;
$$;

create or replace function public.join_group_chat_by_invite(target_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare selected_group_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into selected_group_id
  from public.group_chats
  where invite_code = target_invite_code;
  if selected_group_id is null then raise exception 'Invite link is invalid'; end if;
  insert into public.group_chat_members (group_id, user_id)
  values (selected_group_id, auth.uid())
  on conflict do nothing;
  return selected_group_id;
end;
$$;

grant execute on function public.list_group_chats() to authenticated;
grant execute on function public.join_group_chat(uuid) to authenticated;
grant execute on function public.join_group_chat_by_invite(text) to authenticated;
grant select, insert, update, delete on public.group_chats to authenticated;
grant select, insert, delete on public.group_chat_members to authenticated;
grant select, insert on public.group_chat_messages to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-images',
  'group-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public group pictures are readable" on storage.objects;
create policy "Public group pictures are readable"
  on storage.objects for select
  using (bucket_id = 'group-images');

drop policy if exists "Users upload their group pictures" on storage.objects;
create policy "Users upload their group pictures"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'group-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users manage their group pictures" on storage.objects;
create policy "Users manage their group pictures"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'group-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
