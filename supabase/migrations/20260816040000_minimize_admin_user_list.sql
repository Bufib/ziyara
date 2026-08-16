drop function public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  display_name text,
  party_size int8,
  role public.app_role
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
    profiles.user_id,
    profiles.display_name,
    profiles.party_size,
    profiles.role
  from public.profiles as profiles
  order by profiles.display_name, profiles.user_id;
end;
$$;

comment on function public.admin_list_users() is
  'Returns only the name, represented-person count, role, and internal assignment ID required by the admin people list.';

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

notify pgrst, 'reload schema';
