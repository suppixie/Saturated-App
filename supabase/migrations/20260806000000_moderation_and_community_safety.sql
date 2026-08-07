-- Community safety, blocking, terms acceptance, and moderator operations.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists moderation_note text;

alter table public.reviews
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_at timestamptz;

alter table public.review_comments
  add column if not exists is_hidden boolean not null default false,
  add column if not exists hidden_at timestamptz;

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('moderator', 'admin')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'review', 'comment')),
  target_profile_id uuid references public.profiles(id) on delete cascade,
  target_review_id uuid references public.reviews(id) on delete cascade,
  target_comment_id uuid references public.review_comments(id) on delete cascade,
  reason text not null check (
    reason in (
      'spam',
      'harassment',
      'hate_speech',
      'sexual_content',
      'dangerous_or_illegal',
      'misinformation',
      'intellectual_property',
      'other'
    )
  ),
  details text not null default '' check (length(details) <= 1000),
  status text not null default 'open'
    check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  resolution_note text not null default '' check (length(resolution_note) <= 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  check (
    (target_type = 'profile' and target_profile_id is not null and target_review_id is null and target_comment_id is null)
    or (target_type = 'review' and target_profile_id is null and target_review_id is not null and target_comment_id is null)
    or (target_type = 'comment' and target_profile_id is null and target_review_id is null and target_comment_id is not null)
  )
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.content_reports(id) on delete set null,
  moderator_id uuid references public.profiles(id) on delete set null,
  action text not null check (
    action in (
      'dismiss',
      'hide_content',
      'restore_content',
      'suspend_user',
      'reinstate_user',
      'resolve_no_action'
    )
  ),
  target_type text not null check (target_type in ('profile', 'review', 'comment')),
  target_id uuid not null,
  note text not null default '' check (length(note) <= 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_blocks_blocked_idx
  on public.user_blocks (blocked_id, blocker_id);
create index if not exists content_reports_status_created_idx
  on public.content_reports (status, created_at);
create index if not exists content_reports_reporter_created_idx
  on public.content_reports (reporter_id, created_at desc);
create index if not exists moderation_actions_report_idx
  on public.moderation_actions (report_id, created_at);

drop trigger if exists content_reports_set_updated_at on public.content_reports;
create trigger content_reports_set_updated_at
before update on public.content_reports
for each row execute function public.set_updated_at();

create or replace function public.is_moderator(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = check_user_id
      and role in ('moderator', 'admin')
  );
$$;

create or replace function public.users_blocked(first_user_id uuid, second_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when first_user_id is null or second_user_id is null then false
    else exists (
      select 1
      from public.user_blocks
      where (blocker_id = first_user_id and blocked_id = second_user_id)
         or (blocker_id = second_user_id and blocked_id = first_user_id)
    )
  end;
$$;

create or replace function public.accept_community_terms()
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_at timestamptz := timezone('utc', now());
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  update public.profiles
  set terms_accepted_at = coalesce(terms_accepted_at, accepted_at)
  where id = auth.uid()
  returning terms_accepted_at into accepted_at;
  return accepted_at;
end;
$$;

create or replace function public.block_user(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if target_profile_id = current_user_id then
    raise exception 'You cannot block yourself';
  end if;
  if not exists (select 1 from public.profiles where id = target_profile_id) then
    raise exception 'Profile not found';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (current_user_id, target_profile_id)
  on conflict do nothing;

  delete from public.follows
  where (follower_id = current_user_id and following_id = target_profile_id)
     or (follower_id = target_profile_id and following_id = current_user_id);

  return true;
end;
$$;

create or replace function public.unblock_user(target_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  delete from public.user_blocks
  where blocker_id = auth.uid() and blocked_id = target_profile_id;
  return false;
end;
$$;

create or replace function public.submit_content_report(
  report_target_type text,
  report_target_id uuid,
  report_reason text,
  report_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  report_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if report_target_type not in ('profile', 'review', 'comment') then
    raise exception 'Unsupported report type';
  end if;
  if report_reason not in (
    'spam', 'harassment', 'hate_speech', 'sexual_content',
    'dangerous_or_illegal', 'misinformation', 'intellectual_property', 'other'
  ) then
    raise exception 'Unsupported report reason';
  end if;
  if length(coalesce(report_details, '')) > 1000 then
    raise exception 'Report details are too long';
  end if;

  if report_target_type = 'profile' and not exists (
    select 1 from public.profiles where id = report_target_id
  ) then
    raise exception 'Profile not found';
  elsif report_target_type = 'review' and not exists (
    select 1 from public.reviews where id = report_target_id
  ) then
    raise exception 'Review not found';
  elsif report_target_type = 'comment' and not exists (
    select 1 from public.review_comments where id = report_target_id
  ) then
    raise exception 'Comment not found';
  end if;

  select id into report_id
  from public.content_reports
  where reporter_id = current_user_id
    and target_type = report_target_type
    and status in ('open', 'in_review')
    and (
      (report_target_type = 'profile' and target_profile_id = report_target_id)
      or (report_target_type = 'review' and target_review_id = report_target_id)
      or (report_target_type = 'comment' and target_comment_id = report_target_id)
    )
  order by created_at desc
  limit 1;

  if report_id is not null then
    return report_id;
  end if;

  insert into public.content_reports (
    reporter_id,
    target_type,
    target_profile_id,
    target_review_id,
    target_comment_id,
    reason,
    details
  ) values (
    current_user_id,
    report_target_type,
    case when report_target_type = 'profile' then report_target_id end,
    case when report_target_type = 'review' then report_target_id end,
    case when report_target_type = 'comment' then report_target_id end,
    report_reason,
    trim(coalesce(report_details, ''))
  ) returning id into report_id;

  return report_id;
end;
$$;

create or replace function public.resolve_content_report(
  target_report_id uuid,
  moderation_action text,
  moderator_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  report_record public.content_reports%rowtype;
  affected_user_id uuid;
  action_target_id uuid;
begin
  if not public.is_moderator(auth.uid()) then
    raise exception 'Moderator access required';
  end if;
  if moderation_action not in (
    'dismiss', 'hide_content', 'restore_content',
    'suspend_user', 'reinstate_user', 'resolve_no_action'
  ) then
    raise exception 'Unsupported moderation action';
  end if;

  select * into report_record
  from public.content_reports
  where id = target_report_id
  for update;
  if not found then
    raise exception 'Report not found';
  end if;

  if report_record.target_type = 'profile' then
    affected_user_id := report_record.target_profile_id;
    action_target_id := report_record.target_profile_id;
  elsif report_record.target_type = 'review' then
    select user_id into affected_user_id
    from public.reviews where id = report_record.target_review_id;
    action_target_id := report_record.target_review_id;
  else
    select user_id into affected_user_id
    from public.review_comments where id = report_record.target_comment_id;
    action_target_id := report_record.target_comment_id;
  end if;

  if moderation_action = 'hide_content' then
    if report_record.target_type = 'review' then
      update public.reviews
      set is_hidden = true, hidden_at = timezone('utc', now())
      where id = report_record.target_review_id;
    elsif report_record.target_type = 'comment' then
      update public.review_comments
      set is_hidden = true, hidden_at = timezone('utc', now())
      where id = report_record.target_comment_id;
    else
      update public.profiles
      set is_suspended = true,
          suspended_at = timezone('utc', now()),
          moderation_note = trim(coalesce(moderator_note, ''))
      where id = affected_user_id;
    end if;
  elsif moderation_action = 'restore_content' then
    if report_record.target_type = 'review' then
      update public.reviews set is_hidden = false, hidden_at = null
      where id = report_record.target_review_id;
    elsif report_record.target_type = 'comment' then
      update public.review_comments set is_hidden = false, hidden_at = null
      where id = report_record.target_comment_id;
    end if;
  elsif moderation_action = 'suspend_user' then
    update public.profiles
    set is_suspended = true,
        suspended_at = timezone('utc', now()),
        moderation_note = trim(coalesce(moderator_note, ''))
    where id = affected_user_id;
  elsif moderation_action = 'reinstate_user' then
    update public.profiles
    set is_suspended = false, suspended_at = null, moderation_note = null
    where id = affected_user_id;
  end if;

  update public.content_reports
  set status = case when moderation_action = 'dismiss' then 'dismissed' else 'resolved' end,
      assigned_to = auth.uid(),
      resolution_note = trim(coalesce(moderator_note, '')),
      resolved_at = timezone('utc', now())
  where id = target_report_id;

  insert into public.moderation_actions (
    report_id, moderator_id, action, target_type, target_id, note
  ) values (
    target_report_id,
    auth.uid(),
    moderation_action,
    report_record.target_type,
    action_target_id,
    trim(coalesce(moderator_note, ''))
  );
end;
$$;

alter table public.user_roles enable row level security;
alter table public.user_blocks enable row level security;
alter table public.content_reports enable row level security;
alter table public.moderation_actions enable row level security;

drop policy if exists "Users read relevant blocks" on public.user_blocks;
create policy "Users read relevant blocks"
on public.user_blocks for select
to authenticated
using (blocker_id = (select auth.uid()) or blocked_id = (select auth.uid()));

drop policy if exists "Users manage outgoing blocks" on public.user_blocks;
create policy "Users manage outgoing blocks"
on public.user_blocks for all
to authenticated
using (blocker_id = (select auth.uid()))
with check (blocker_id = (select auth.uid()));

drop policy if exists "Users create reports" on public.content_reports;
create policy "Users create reports"
on public.content_reports for insert
to authenticated
with check (reporter_id = (select auth.uid()));

drop policy if exists "Users read own reports and moderators read all" on public.content_reports;
create policy "Users read own reports and moderators read all"
on public.content_reports for select
to authenticated
using (reporter_id = (select auth.uid()) or public.is_moderator());

drop policy if exists "Moderators update reports" on public.content_reports;
create policy "Moderators update reports"
on public.content_reports for update
to authenticated
using (public.is_moderator())
with check (public.is_moderator());

drop policy if exists "Moderators read roles" on public.user_roles;
create policy "Moderators read roles"
on public.user_roles for select
to authenticated
using (user_id = (select auth.uid()) or public.is_moderator());

drop policy if exists "Moderators read actions" on public.moderation_actions;
create policy "Moderators read actions"
on public.moderation_actions for select
to authenticated
using (public.is_moderator());

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Visible profiles are readable"
on public.profiles for select
to anon, authenticated
using (
  public.is_moderator()
  or id = (select auth.uid())
  or (
    not is_suspended
    and not public.users_blocked((select auth.uid()), id)
  )
);

drop policy if exists "Reviews are publicly readable" on public.reviews;
create policy "Visible reviews are readable"
on public.reviews for select
to anon, authenticated
using (
  public.is_moderator()
  or user_id = (select auth.uid())
  or (
    not is_hidden
    and not public.users_blocked((select auth.uid()), user_id)
    and not exists (
      select 1 from public.profiles
      where profiles.id = reviews.user_id and profiles.is_suspended
    )
  )
);

drop policy if exists "Users create their own reviews" on public.reviews;
create policy "Eligible users create their own reviews"
on public.reviews for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.terms_accepted_at is not null
      and not profiles.is_suspended
  )
);

drop policy if exists "Review comments are publicly readable" on public.review_comments;
create policy "Visible review comments are readable"
on public.review_comments for select
to anon, authenticated
using (
  public.is_moderator()
  or user_id = (select auth.uid())
  or (
    not is_hidden
    and not public.users_blocked((select auth.uid()), user_id)
    and not exists (
      select 1 from public.profiles
      where profiles.id = review_comments.user_id and profiles.is_suspended
    )
  )
);

drop policy if exists "Users create their own comments" on public.review_comments;
create policy "Eligible users create their own comments"
on public.review_comments for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.terms_accepted_at is not null
      and not profiles.is_suspended
  )
);

grant select on public.user_roles, public.user_blocks, public.content_reports,
  public.moderation_actions to authenticated;
grant insert on public.content_reports to authenticated;
grant insert, delete on public.user_blocks to authenticated;

revoke all on function public.is_moderator(uuid) from public, anon;
revoke all on function public.users_blocked(uuid, uuid) from public, anon;
revoke all on function public.accept_community_terms() from public, anon;
revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
revoke all on function public.submit_content_report(text, uuid, text, text) from public, anon;
revoke all on function public.resolve_content_report(uuid, text, text) from public, anon;

grant execute on function public.is_moderator(uuid) to authenticated;
grant execute on function public.users_blocked(uuid, uuid) to authenticated;
grant execute on function public.accept_community_terms() to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.submit_content_report(text, uuid, text, text) to authenticated;
grant execute on function public.resolve_content_report(uuid, text, text) to authenticated;

create or replace view public.moderation_queue
with (security_invoker = true)
as
select
  report.id,
  report.target_type,
  report.reason,
  report.details,
  report.status,
  report.created_at,
  report.target_profile_id,
  report.target_review_id,
  report.target_comment_id,
  reporter.display_name as reporter_name,
  coalesce(profile_target.id, review_author.id, comment_author.id) as target_user_id,
  coalesce(profile_target.display_name, review_author.display_name, comment_author.display_name) as target_user_name,
  case
    when report.target_type = 'profile' then coalesce(profile_target.bio, profile_target.display_name)
    when report.target_type = 'review' then target_review.body
    when report.target_type = 'comment' then target_comment.body
  end as content_preview
from public.content_reports report
join public.profiles reporter on reporter.id = report.reporter_id
left join public.profiles profile_target on profile_target.id = report.target_profile_id
left join public.reviews target_review on target_review.id = report.target_review_id
left join public.profiles review_author on review_author.id = target_review.user_id
left join public.review_comments target_comment on target_comment.id = report.target_comment_id
left join public.profiles comment_author on comment_author.id = target_comment.user_id
where public.is_moderator();

grant select on public.moderation_queue to authenticated;

-- The project currently has one founder profile. Give the oldest existing
-- profile access to the moderation queue; future roles must be assigned by an admin.
insert into public.user_roles (user_id, role)
select id, 'admin'
from public.profiles
order by created_at, id
limit 1
on conflict (user_id) do nothing;

-- Existing users must accept the community rules before posting new UGC.
-- The app prompts and records acceptance on the next authenticated session.

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
      is_hidden = false,
      hidden_at = null,
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

revoke all on function public.save_review(text, numeric, text, text[]) from public, anon;
grant execute on function public.save_review(text, numeric, text, text[]) to authenticated;
