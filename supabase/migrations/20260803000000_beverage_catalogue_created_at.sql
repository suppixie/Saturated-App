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
  b.created_at,
  coalesce(round(avg(r.rating)::numeric, 1), 0::numeric) as average_rating,
  count(r.id)::integer as review_count
from public.beverages b
left join public.reviews r on r.beverage_id = b.id
where b.is_published
group by b.id;
