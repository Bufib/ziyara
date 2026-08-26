alter table public.role_assignment_audit
alter column target_user_id drop not null;

comment on column public.role_assignment_audit.target_user_id is
  'Auth user ID affected by the role change. Set to null when that account is deleted so the audit event remains without a persistent account identifier.';

create or replace function public.protect_account_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleting_profile_role public.app_role;
  remaining_admin_count int8;
begin
  -- Account deletion and role assignment use the same transaction-wide lock.
  -- This prevents two concurrent deletions or a deletion and demotion from
  -- independently concluding that another administrator will remain.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('public.admin_set_user_role', 0)
  );

  select profiles.role
  into deleting_profile_role
  from public.profiles as profiles
  where profiles.user_id = old.id
  for update;

  if deleting_profile_role = 'admin' then
    select count(*)
    into remaining_admin_count
    from public.profiles as profiles
    where profiles.role = 'admin';

    if remaining_admin_count <= 1 then
      raise exception 'The last administrator cannot delete their account.'
        using errcode = 'P0001';
    end if;
  end if;

  -- Keep the non-identifying role-change history while removing the deleted
  -- account UUID. changed_by_profile_id is anonymized separately by its
  -- existing ON DELETE SET NULL foreign key when the profile cascades away.
  update public.role_assignment_audit
  set target_user_id = null
  where target_user_id = old.id;

  return old;
end;
$$;

comment on function public.protect_account_deletion() is
  'Protects the final administrator and anonymizes retained role-audit rows before an Auth user is deleted.';

revoke all on function public.protect_account_deletion() from public, anon, authenticated;

create trigger protect_auth_user_account_deletion
before delete on auth.users
for each row
execute function public.protect_account_deletion();
