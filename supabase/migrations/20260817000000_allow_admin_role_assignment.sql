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
  admin_count int8;
  admin_profile_id int8;
  current_target_role public.app_role;
  updated_profile public.profiles;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_role is null then
    raise exception 'A role is required.' using errcode = '22023';
  end if;

  -- Serialize every role change so two administrators cannot demote the last
  -- two administrator accounts concurrently.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public.admin_set_user_role', 0)
  );

  -- Recheck after waiting for the lock in case this caller was demoted by a
  -- role change that completed while this transaction was waiting.
  if not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select profiles.id
  into admin_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid())
    and profiles.role = 'admin';

  select profiles.role
  into current_target_role
  from public.profiles as profiles
  where profiles.user_id = p_user_id
  for update;

  if not found then
    raise exception 'User profile not found.' using errcode = 'P0002';
  end if;

  if current_target_role = p_role then
    select profiles.*
    into updated_profile
    from public.profiles as profiles
    where profiles.user_id = p_user_id;

    return updated_profile;
  end if;

  if current_target_role = 'admin' and p_role <> 'admin' then
    select count(*)
    into admin_count
    from public.profiles as profiles
    where profiles.role = 'admin';

    if admin_count <= 1 then
      raise exception 'At least one administrator must remain.' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles
  set role = p_role
  where user_id = p_user_id
  returning * into updated_profile;

  insert into public.role_assignment_audit (
    changed_by_profile_id,
    target_user_id,
    previous_role,
    new_role
  )
  values (admin_profile_id, p_user_id, current_target_role, p_role);

  return updated_profile;
end;
$$;

comment on function public.admin_set_user_role(uuid, public.app_role) is
  'Allows administrators to assign every application role, audits changes, serializes concurrent assignments, and prevents demotion of the last administrator.';

revoke all on function public.admin_set_user_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;

-- Role changes should take effect in an already-open app without requiring a
-- sign-out. Existing profile RLS limits each non-admin client to its own row.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;

notify pgrst, 'reload schema';
