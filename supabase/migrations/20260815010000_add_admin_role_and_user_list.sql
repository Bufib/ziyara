create type public.app_role as enum ('user', 'admin');

alter table public.profiles
add column role public.app_role not null default 'user';

comment on column public.profiles.role is
  'Application role. Only trusted database administrators may change this value.';

create index profiles_role_idx on public.profiles (role);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using ((select public.is_admin()));

create or replace function public.admin_list_users()
returns table (
  profile_id int8,
  user_id uuid,
  display_name text,
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
  'Returns account details only when the caller has the admin application role.';

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
