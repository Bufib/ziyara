alter table public.profiles
add column party_size int8 not null default 1
check (party_size between 1 and 50);

comment on column public.profiles.party_size is
  'Number of people represented by this account, including the account owner.';

grant update (party_size) on table public.profiles to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_party_size int8 := 1;
begin
  if coalesce(new.raw_user_meta_data ->> 'party_size', '') ~ '^[0-9]+$' then
    requested_party_size := least(
      greatest((new.raw_user_meta_data ->> 'party_size')::int8, 1),
      50
    );
  end if;

  insert into public.profiles (user_id, display_name, party_size)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Benutzer'
    ),
    requested_party_size
  );

  return new;
end;
$$;

drop function public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  profile_id int8,
  user_id uuid,
  display_name text,
  party_size int8,
  email text,
  role public.app_role,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  return query
  select
    profiles.id,
    profiles.user_id,
    profiles.display_name,
    profiles.party_size,
    auth_users.email::text,
    profiles.role,
    profiles.created_at,
    auth_users.last_sign_in_at
  from public.profiles as profiles
  join auth.users as auth_users on auth_users.id = profiles.user_id
  order by profiles.created_at desc;
end;
$$;

comment on function public.admin_list_users() is
  'Returns account and represented-person counts only when the caller is an admin.';

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

notify pgrst, 'reload schema';
