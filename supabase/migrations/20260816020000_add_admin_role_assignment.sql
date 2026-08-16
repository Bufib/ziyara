create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role public.app_role
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_target_role public.app_role;
  updated_profile public.profiles;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_role is null or p_role not in ('user', 'medical_staff', 'organization_team') then
    raise exception 'This role cannot be assigned from the app.' using errcode = '22023';
  end if;

  select role
  into current_target_role
  from public.profiles
  where user_id = p_user_id;

  if not found then
    raise exception 'User profile not found.' using errcode = 'P0002';
  end if;

  if current_target_role = 'admin' then
    raise exception 'Administrator roles are protected.' using errcode = '42501';
  end if;

  update public.profiles
  set role = p_role
  where user_id = p_user_id
  returning * into updated_profile;

  return updated_profile;
end;
$$;

comment on function public.admin_set_user_role(uuid, public.app_role) is
  'Allows administrators to assign non-admin application roles. Administrator roles remain protected.';

revoke all on function public.admin_set_user_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;

notify pgrst, 'reload schema';
