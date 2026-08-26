create or replace function public.can_delete_account(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.profiles as target_profile
    where target_profile.user_id = p_user_id
      and target_profile.role = 'admin'
      and (
        select count(*)
        from public.profiles as admin_profiles
        where admin_profiles.role = 'admin'
      ) <= 1
  );
$$;

comment on function public.can_delete_account(uuid) is
  'Service-only preflight for account deletion. The auth.users trigger remains the transactional authority for final-admin protection.';

revoke all on function public.can_delete_account(uuid) from public, anon, authenticated;
grant execute on function public.can_delete_account(uuid) to service_role;

notify pgrst, 'reload schema';
