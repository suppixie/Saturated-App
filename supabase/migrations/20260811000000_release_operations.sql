-- Release operations: catalogue lifecycle, request administration,
-- in-app notifications, and privacy-minimised diagnostics.

alter table public.beverages
  add column if not exists lifecycle_status text not null default 'active',
  add column if not exists duplicate_of text references public.beverages(id) on delete set null,
  add column if not exists admin_note text not null default '';

alter table public.beverages
  drop constraint if exists beverages_lifecycle_status_check;
alter table public.beverages
  add constraint beverages_lifecycle_status_check
  check (lifecycle_status in ('draft', 'active', 'discontinued', 'duplicate', 'archived'));

update public.beverages
set lifecycle_status = case when is_published then 'active' else 'draft' end
where lifecycle_status = 'active' and not is_published;

alter table public.drink_requests
  add column if not exists resolution_note text not null default '',
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_beverage_id text references public.beverages(id) on delete set null;

create index if not exists beverages_lifecycle_idx
  on public.beverages (lifecycle_status, updated_at desc);
create index if not exists beverages_duplicate_of_idx
  on public.beverages (duplicate_of)
  where duplicate_of is not null;

drop policy if exists "Moderators read all beverages" on public.beverages;
create policy "Moderators read all beverages"
on public.beverages for select
to authenticated
using (public.is_moderator());

drop policy if exists "Moderators update beverages" on public.beverages;
create policy "Moderators update beverages"
on public.beverages for update
to authenticated
using (public.is_moderator())
with check (public.is_moderator());

drop policy if exists "Moderators read drink requests" on public.drink_requests;
create policy "Moderators read drink requests"
on public.drink_requests for select
to authenticated
using (public.is_moderator());

drop policy if exists "Moderators update drink requests" on public.drink_requests;
create policy "Moderators update drink requests"
on public.drink_requests for update
to authenticated
using (public.is_moderator())
with check (public.is_moderator());

grant update on public.beverages, public.drink_requests to authenticated;

create or replace view public.beverage_catalogue
with (security_invoker = true)
as
select
  b.id,
  b.name,
  b.category,
  b.subtype,
  b.brand,
  b.origin,
  b.description,
  b.image_url,
  b.official_tags,
  b.is_published,
  coalesce(round(avg(r.rating)::numeric, 1), 0::numeric) as average_rating,
  count(r.id)::integer as review_count,
  b.created_at,
  b.lifecycle_status
from public.beverages b
left join public.reviews r on r.beverage_id = b.id
where b.is_published and b.lifecycle_status in ('active', 'discontinued')
group by b.id;

grant select on public.beverage_catalogue to anon, authenticated;

create or replace function public.admin_update_beverage(
  target_beverage_id text,
  next_status text,
  duplicate_beverage_id text default null,
  note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'Moderator access required';
  end if;
  if next_status not in ('draft', 'active', 'discontinued', 'duplicate', 'archived') then
    raise exception 'Unsupported catalogue status';
  end if;
  if next_status = 'duplicate' and duplicate_beverage_id is null then
    raise exception 'A canonical beverage is required for duplicate records';
  end if;
  if duplicate_beverage_id = target_beverage_id then
    raise exception 'A beverage cannot duplicate itself';
  end if;

  update public.beverages
  set lifecycle_status = next_status,
      duplicate_of = case when next_status = 'duplicate' then duplicate_beverage_id else null end,
      admin_note = trim(coalesce(note, '')),
      is_published = (next_status in ('active', 'discontinued'))
  where id = target_beverage_id;

  if not found then raise exception 'Beverage not found'; end if;
end;
$$;

create or replace function public.admin_resolve_drink_request(
  target_request_id uuid,
  next_status text,
  note text default '',
  linked_beverage_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'Moderator access required';
  end if;
  if next_status not in ('pending', 'approved', 'rejected') then
    raise exception 'Unsupported request status';
  end if;

  update public.drink_requests
  set status = next_status,
      resolution_note = trim(coalesce(note, '')),
      resolved_beverage_id = linked_beverage_id,
      resolved_by = case when next_status = 'pending' then null else auth.uid() end,
      resolved_at = case when next_status = 'pending' then null else timezone('utc', now()) end
  where id = target_request_id;

  if not found then raise exception 'Drink request not found'; end if;
end;
$$;

revoke all on function public.admin_update_beverage(text, text, text, text) from public, anon;
revoke all on function public.admin_resolve_drink_request(uuid, text, text, text) from public, anon;
grant execute on function public.admin_update_beverage(text, text, text, text) to authenticated;
grant execute on function public.admin_resolve_drink_request(uuid, text, text, text) to authenticated;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('review_like', 'review_comment', 'follow', 'badge_earned')),
  review_id uuid references public.reviews(id) on delete cascade,
  comment_id uuid references public.review_comments(id) on delete cascade,
  badge_id text references public.badges(id) on delete cascade,
  beverage_id text references public.beverages(id) on delete cascade,
  dedupe_key text not null unique,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (user_id, is_read, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "Users read their notifications" on public.notifications;
create policy "Users read their notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));
drop policy if exists "Users update their notifications" on public.notifications;
create policy "Users update their notifications"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
drop policy if exists "Users delete their notifications" on public.notifications;
create policy "Users delete their notifications"
on public.notifications for delete to authenticated
using (user_id = (select auth.uid()));
grant select, update, delete on public.notifications to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

create or replace function public.notify_review_like()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; target_beverage text;
begin
  select user_id, beverage_id into owner_id, target_beverage
  from public.reviews where id = new.review_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications
      (user_id, actor_id, kind, review_id, beverage_id, dedupe_key)
    values
      (owner_id, new.user_id, 'review_like', new.review_id, target_beverage,
       'like:' || new.review_id::text || ':' || new.user_id::text)
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.notify_review_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; target_beverage text;
begin
  select user_id, beverage_id into owner_id, target_beverage
  from public.reviews where id = new.review_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.notifications
      (user_id, actor_id, kind, review_id, comment_id, beverage_id, dedupe_key)
    values
      (owner_id, new.user_id, 'review_comment', new.review_id, new.id,
       target_beverage, 'comment:' || new.id::text)
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.notify_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, actor_id, kind, dedupe_key)
  values (new.following_id, new.follower_id, 'follow',
          'follow:' || new.follower_id::text || ':' || new.following_id::text)
  on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

create or replace function public.notify_badge_earned()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.earned_at is not null and (tg_op = 'INSERT' or old.earned_at is null) then
    insert into public.notifications (user_id, kind, badge_id, dedupe_key)
    values (new.user_id, 'badge_earned', new.badge_id,
            'badge:' || new.user_id::text || ':' || new.badge_id)
    on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_review_like_insert on public.review_likes;
create trigger notify_review_like_insert after insert on public.review_likes
for each row execute function public.notify_review_like();
drop trigger if exists notify_review_comment_insert on public.review_comments;
create trigger notify_review_comment_insert after insert on public.review_comments
for each row execute function public.notify_review_comment();
drop trigger if exists notify_follow_insert on public.follows;
create trigger notify_follow_insert after insert on public.follows
for each row execute function public.notify_follow();
drop trigger if exists notify_badge_earned_change on public.user_badges;
create trigger notify_badge_earned_change after insert or update of earned_at on public.user_badges
for each row execute function public.notify_badge_earned();

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text not null,
  session_id text not null,
  event_name text not null check (length(event_name) between 2 and 64),
  properties jsonb not null default '{}'::jsonb,
  platform text not null default 'unknown',
  app_version text not null default 'unknown',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.crash_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text not null,
  message text not null,
  stack text not null default '',
  context jsonb not null default '{}'::jsonb,
  platform text not null default 'unknown',
  app_version text not null default 'unknown',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);
create index if not exists crash_reports_created_idx on public.crash_reports (created_at desc);
alter table public.analytics_events enable row level security;
alter table public.crash_reports enable row level security;

drop policy if exists "Clients insert analytics" on public.analytics_events;
create policy "Clients insert analytics" on public.analytics_events
for insert to anon, authenticated
with check (user_id is null or user_id = (select auth.uid()));
drop policy if exists "Clients insert crash reports" on public.crash_reports;
create policy "Clients insert crash reports" on public.crash_reports
for insert to anon, authenticated
with check (user_id is null or user_id = (select auth.uid()));
drop policy if exists "Moderators read analytics" on public.analytics_events;
create policy "Moderators read analytics" on public.analytics_events
for select to authenticated using (public.is_moderator());
drop policy if exists "Moderators read crash reports" on public.crash_reports;
create policy "Moderators read crash reports" on public.crash_reports
for select to authenticated using (public.is_moderator());
drop policy if exists "Users read their analytics" on public.analytics_events;
create policy "Users read their analytics" on public.analytics_events
for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users read their crash reports" on public.crash_reports;
create policy "Users read their crash reports" on public.crash_reports
for select to authenticated using (user_id = (select auth.uid()));

grant insert on public.analytics_events, public.crash_reports to anon, authenticated;
grant select on public.analytics_events, public.crash_reports to authenticated;
grant usage, select on sequence public.analytics_events_id_seq to anon, authenticated;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  delete from public.analytics_events where user_id = current_user_id;
  delete from public.crash_reports where user_id = current_user_id;
  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
