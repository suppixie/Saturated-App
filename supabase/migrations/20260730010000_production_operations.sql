create table if not exists public.review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (review_id, storage_path)
);

create index if not exists review_images_review_idx
  on public.review_images (review_id, created_at);

alter table public.review_images enable row level security;

drop policy if exists "Review images are publicly readable" on public.review_images;
create policy "Review images are publicly readable"
on public.review_images for select
to anon, authenticated
using (true);

drop policy if exists "Review owners manage images" on public.review_images;
create policy "Review owners manage images"
on public.review_images for all
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.reviews
    where reviews.id = review_id
      and reviews.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.reviews
    where reviews.id = review_id
      and reviews.user_id = (select auth.uid())
  )
);

grant select on public.review_images to anon, authenticated;
grant insert, delete on public.review_images to authenticated;

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
  count(r.id)::integer as review_count
from public.beverages b
left join public.reviews r on r.beverage_id = b.id
where b.is_published
group by b.id;

create or replace view public.review_details
with (security_invoker = true)
as
select
  r.id,
  r.beverage_id,
  r.user_id,
  r.rating,
  r.body,
  r.created_at,
  r.updated_at,
  p.display_name,
  p.username,
  p.avatar_url,
  coalesce(
    (
      select array_agg(ft.name::text order by ft.name::text)
      from public.review_flavour_tags rft
      join public.flavour_tags ft on ft.id = rft.flavour_tag_id
      where rft.review_id = r.id
    ),
    '{}'::text[]
  ) as flavour_tags,
  (
    select count(*)::integer
    from public.review_likes rl
    where rl.review_id = r.id
  ) as like_count,
  (
    select count(*)::integer
    from public.review_comments rc
    where rc.review_id = r.id
  ) as comment_count,
  coalesce(
    (
      select array_agg(ri.public_url order by ri.created_at)
      from public.review_images ri
      where ri.review_id = r.id
    ),
    '{}'::text[]
  ) as image_urls
from public.reviews r
join public.profiles p on p.id = r.user_id;

grant select on public.beverage_catalogue, public.review_details
to anon, authenticated;

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
    select 1 from public.beverages
    where id = target_beverage_id and is_published
  ) then
    raise exception 'Beverage not found';
  end if;

  if review_rating < 0.5
     or review_rating > 5
     or mod(review_rating * 2, 1) <> 0 then
    raise exception 'Rating must be between 0.5 and 5 in half-star steps';
  end if;

  if length(trim(review_body)) = 0 then
    raise exception 'Review text is required';
  end if;

  insert into public.reviews (beverage_id, user_id, rating, body)
  values (target_beverage_id, current_user_id, review_rating, trim(review_body))
  on conflict (beverage_id, user_id) do update
  set
    rating = excluded.rating,
    body = excluded.body,
    updated_at = timezone('utc', now())
  returning id into saved_review_id;

  delete from public.review_flavour_tags
  where review_id = saved_review_id;

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
  where user_id = current_user_id
    and beverage_id = target_beverage_id;

  perform public.refresh_my_badges();
  return saved_review_id;
end;
$$;

create or replace function public.toggle_review_like(target_review_id uuid)
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

  if exists (
    select 1 from public.review_likes
    where review_id = target_review_id and user_id = current_user_id
  ) then
    delete from public.review_likes
    where review_id = target_review_id and user_id = current_user_id;
    return false;
  end if;

  insert into public.review_likes (review_id, user_id)
  values (target_review_id, current_user_id);
  return true;
end;
$$;

create or replace function public.toggle_drinklist(target_beverage_id text)
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

  if exists (
    select 1 from public.drinklist
    where beverage_id = target_beverage_id and user_id = current_user_id
  ) then
    delete from public.drinklist
    where beverage_id = target_beverage_id and user_id = current_user_id;
    return false;
  end if;

  insert into public.drinklist (user_id, beverage_id)
  values (current_user_id, target_beverage_id);
  return true;
end;
$$;

create or replace function public.toggle_follow(target_profile_id uuid)
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
  if current_user_id = target_profile_id then
    raise exception 'You cannot follow yourself';
  end if;

  if exists (
    select 1 from public.follows
    where follower_id = current_user_id and following_id = target_profile_id
  ) then
    delete from public.follows
    where follower_id = current_user_id and following_id = target_profile_id;
    perform public.refresh_my_badges();
    return false;
  end if;

  insert into public.follows (follower_id, following_id)
  values (current_user_id, target_profile_id);
  perform public.refresh_my_badges();
  return true;
end;
$$;

create or replace function public.refresh_my_badges()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  review_total integer;
  buddy_total integer;
begin
  if current_user_id is null then
    return;
  end if;

  select count(*)::integer into review_total
  from public.reviews
  where user_id = current_user_id;

  select count(*)::integer into buddy_total
  from public.follows
  where follower_id = current_user_id;

  insert into public.user_badges (user_id, badge_id, progress, earned_at)
  select
    current_user_id,
    b.id,
    least(
      case
        when b.id = 'social-sipper' then buddy_total
        else review_total
      end,
      b.target
    ),
    case
      when (
        case
          when b.id = 'social-sipper' then buddy_total
          else review_total
        end
      ) >= b.target then coalesce(
        (
          select earned_at
          from public.user_badges
          where user_id = current_user_id and badge_id = b.id
        ),
        timezone('utc', now())
      )
      else null
    end
  from public.badges b
  on conflict (user_id, badge_id) do update
  set
    progress = excluded.progress,
    earned_at = excluded.earned_at,
    updated_at = timezone('utc', now());
end;
$$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.save_review(text, numeric, text, text[])
from public, anon;
revoke all on function public.toggle_review_like(uuid) from public, anon;
revoke all on function public.toggle_drinklist(text) from public, anon;
revoke all on function public.toggle_follow(uuid) from public, anon;
revoke all on function public.refresh_my_badges() from public, anon;
revoke all on function public.delete_my_account() from public, anon;

grant execute on function public.save_review(text, numeric, text, text[])
to authenticated;
grant execute on function public.toggle_review_like(uuid) to authenticated;
grant execute on function public.toggle_drinklist(text) to authenticated;
grant execute on function public.toggle_follow(uuid) to authenticated;
grant execute on function public.refresh_my_badges() to authenticated;
grant execute on function public.delete_my_account() to authenticated;

insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public review images are readable" on storage.objects;
create policy "Public review images are readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'review-images');

drop policy if exists "Users upload their review images" on storage.objects;
create policy "Users upload their review images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'review-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users update their review images" on storage.objects;
create policy "Users update their review images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'review-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'review-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users delete their review images" on storage.objects;
create policy "Users delete their review images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'review-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
