insert into public.badges (id, name, description, target)
values
  ('first-sip', 'First Sip', 'Log your first drink.', 1),
  ('five-sips', 'Five Sips', 'Log five drinks.', 5),
  ('ten-sips', 'Ten Sips', 'Log ten drinks.', 10),
  ('social-sipper', 'Social Sipper', 'Comment on twenty reviews written by other people.', 20),
  ('wine-much', 'Wine much', 'Review ten wines.', 10),
  ('caffeine-in-my-blood', 'Caffeine in my Blood', 'Review ten coffee drinks.', 10),
  ('around-the-world', 'Around the World', 'Review drinks from ten different origins.', 10),
  ('pint-master', 'Pint Master', 'Review fifteen beers.', 15),
  ('cocktailio', 'Cocktailio', 'Review fifteen cocktails.', 15),
  ('always-on-the-rocks', 'Always on the rocks', 'Review ten whiskeys.', 10),
  ('drink-buddy', 'The Drink Buddy', 'Connect with twenty buddies.', 20),
  ('receipt-maxx', 'Receipt Maxx', 'Review fifty drinks.', 50)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  target = excluded.target;

delete from public.badges
where id in ('coke-zero-gang', 'spritz-or-nothing');

create or replace function public.refresh_my_badges()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  review_total integer := 0;
  comment_total integer := 0;
  buddy_total integer := 0;
  wine_total integer := 0;
  coffee_total integer := 0;
  origin_total integer := 0;
  beer_total integer := 0;
  cocktail_total integer := 0;
  whiskey_total integer := 0;
begin
  if current_user_id is null then
    return;
  end if;

  select
    count(*)::integer,
    count(*) filter (where lower(b.category) = 'wine')::integer,
    count(*) filter (where lower(b.category) = 'coffee')::integer,
    count(distinct lower(trim(b.origin)))
      filter (where nullif(trim(b.origin), '') is not null)::integer,
    count(*) filter (where lower(b.category) = 'beer')::integer,
    count(*) filter (where lower(b.category) = 'cocktail')::integer,
    count(*) filter (where lower(b.category) in ('whiskey', 'whisky'))::integer
  into
    review_total,
    wine_total,
    coffee_total,
    origin_total,
    beer_total,
    cocktail_total,
    whiskey_total
  from public.reviews r
  join public.beverages b on b.id = r.beverage_id
  where r.user_id = current_user_id;

  select count(*)::integer into comment_total
  from public.review_comments c
  join public.reviews r on r.id = c.review_id
  where c.user_id = current_user_id
    and r.user_id <> current_user_id;

  select count(*)::integer into buddy_total
  from public.follows
  where follower_id = current_user_id;

  insert into public.user_badges (user_id, badge_id, progress, earned_at)
  select
    current_user_id,
    b.id,
    least(metric.value, b.target),
    case
      when metric.value >= b.target then coalesce(
        (
          select ub.earned_at
          from public.user_badges ub
          where ub.user_id = current_user_id and ub.badge_id = b.id
        ),
        timezone('utc', now())
      )
      else null
    end
  from public.badges b
  cross join lateral (
    select case b.id
      when 'first-sip' then review_total
      when 'five-sips' then review_total
      when 'ten-sips' then review_total
      when 'social-sipper' then comment_total
      when 'wine-much' then wine_total
      when 'caffeine-in-my-blood' then coffee_total
      when 'around-the-world' then origin_total
      when 'pint-master' then beer_total
      when 'cocktailio' then cocktail_total
      when 'always-on-the-rocks' then whiskey_total
      when 'drink-buddy' then buddy_total
      when 'receipt-maxx' then review_total
      else 0
    end::integer as value
  ) metric
  on conflict (user_id, badge_id) do update
  set
    progress = excluded.progress,
    earned_at = excluded.earned_at,
    updated_at = timezone('utc', now());
end;
$$;

revoke all on function public.refresh_my_badges() from public, anon;
grant execute on function public.refresh_my_badges() to authenticated;
