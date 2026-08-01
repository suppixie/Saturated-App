alter table public.profiles
  add column if not exists date_of_birth date;

create or replace function public.profile_birth_date(metadata jsonb)
returns date
language plpgsql
security invoker
set search_path = ''
as $$
declare
  supplied_date text := nullif(metadata ->> 'date_of_birth', '');
begin
  if supplied_date is null then
    return null;
  end if;
  return supplied_date::date;
exception
  when others then
    return null;
end;
$$;

create or replace function public.enforce_profile_minimum_age()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.date_of_birth is not null
    and new.date_of_birth > current_date - interval '18 years'
  then
    raise exception 'You must be 18+ to use this app.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_minimum_age on public.profiles;
create trigger profiles_enforce_minimum_age
before insert or update of date_of_birth on public.profiles
for each row execute function public.enforce_profile_minimum_age();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplied_birth_date date := public.profile_birth_date(new.raw_user_meta_data);
begin
  insert into public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    date_of_birth,
    birth_verified_at
  )
  values (
    new.id,
    null,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      'Saturated User'
    ),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    supplied_birth_date,
    case when supplied_birth_date is not null then timezone('utc', now()) end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
