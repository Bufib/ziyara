create type public.member_type as enum ('brother', 'sister');

alter table public.profiles
add column member_type public.member_type;

comment on column public.profiles.member_type is
  'Brother/sister selection made during app registration. Null is retained for accounts created before this field existed.';

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_member_type public.member_type := null;
  requested_party_size int8 := 1;
begin
  if coalesce(new.raw_user_meta_data ->> 'member_type', '') in ('brother', 'sister') then
    requested_member_type := (new.raw_user_meta_data ->> 'member_type')::public.member_type;
  end if;

  if coalesce(new.raw_user_meta_data ->> 'party_size', '') ~ '^[0-9]{1,2}$' then
    requested_party_size := least(
      greatest((new.raw_user_meta_data ->> 'party_size')::int8, 1),
      50
    );
  end if;

  insert into public.profiles (user_id, display_name, member_type, party_size)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Benutzer'
    ),
    requested_member_type,
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
  member_type public.member_type,
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
    profiles.member_type,
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
  'Returns account, member type, and represented-person counts only when the caller is an admin.';

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

notify pgrst, 'reload schema';
