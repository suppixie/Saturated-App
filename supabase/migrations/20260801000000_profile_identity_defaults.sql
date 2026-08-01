create or replace function public.available_profile_username(
  preferred_username text,
  account_email text,
  profile_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  candidate text;
  suffix integer := 0;
begin
  base_username := lower(
    regexp_replace(
      coalesce(
        nullif(trim(both '@' from preferred_username), ''),
        nullif(split_part(coalesce(account_email, ''), '@', 1), ''),
        'user'
      ),
      '[^a-z0-9._]+',
      '',
      'g'
    )
  );
  base_username := trim(both '.' from base_username);

  if length(base_username) < 3 then
    base_username := 'user' || substr(replace(profile_id::text, '-', ''), 1, 6);
  end if;

  base_username := left(base_username, 30);
  candidate := base_username;
  while exists (
    select 1
    from public.profiles
    where username = candidate
      and id <> profile_id
  ) loop
    suffix := suffix + 1;
    candidate := left(base_username, 29 - length(suffix::text)) || '_' || suffix;
  end loop;

  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  supplied_birth_date date := public.profile_birth_date(new.raw_user_meta_data);
  supplied_username text := nullif(new.raw_user_meta_data ->> 'username', '');
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
    case
      when supplied_username is not null then
        lower(regexp_replace(trim(both '@' from supplied_username), '[^a-z0-9._]+', '', 'g'))
      else public.available_profile_username(null, new.email, new.id)
    end,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      'Saturated User'
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    supplied_birth_date,
    case when supplied_birth_date is not null then timezone('utc', now()) end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
declare
  account record;
begin
  for account in
    select p.id, u.email
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.username is null or trim(p.username::text) = ''
    order by p.created_at, p.id
  loop
    update public.profiles
    set username = public.available_profile_username(null, account.email, account.id)
    where id = account.id;
  end loop;
end;
$$;
