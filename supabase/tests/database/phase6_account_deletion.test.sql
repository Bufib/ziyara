begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

select is(
  (
    select columns.is_nullable
    from information_schema.columns as columns
    where columns.table_schema = 'public'
      and columns.table_name = 'role_assignment_audit'
      and columns.column_name = 'target_user_id'
  ),
  'YES',
  'role audit target IDs can be anonymized to null'
);
select has_trigger(
  'auth',
  'users',
  'protect_auth_user_account_deletion',
  'Auth user deletion is protected by a database trigger'
);
select has_function(
  'public',
  'can_delete_account',
  array['uuid'],
  'the Edge Function has a narrow account-deletion preflight RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.can_delete_account(uuid)',
    'execute'
  ),
  'anonymous callers cannot run the account-deletion preflight'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.can_delete_account(uuid)',
    'execute'
  ),
  'authenticated clients cannot run the service-only preflight directly'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.can_delete_account(uuid)',
    'execute'
  ),
  'the Edge Function service role can run the preflight'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'phase6-last-admin@example.invalid',
    '{"display_name":"Phase 6 Last Admin"}'::jsonb
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'phase6-delete-user@example.invalid',
    '{"display_name":"Phase 6 Delete User"}'::jsonb
  );

update public.profiles
set role = 'admin'
where user_id = '30000000-0000-0000-0000-000000000001';

select is(
  public.can_delete_account('30000000-0000-0000-0000-000000000001'),
  false,
  'the preflight rejects deletion of the final administrator'
);
select is(
  public.can_delete_account('30000000-0000-0000-0000-000000000002'),
  true,
  'the preflight permits deletion of a regular account'
);

select throws_ok(
  $$
    delete from auth.users
    where id = '30000000-0000-0000-0000-000000000001'
  $$,
  'P0001',
  'The last administrator cannot delete their account.',
  'the final administrator cannot be deleted'
);
select is(
  (
    select count(*)
    from auth.users
    where id = '30000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'the protected final administrator remains present'
);

insert into public.group_checks (id, question, created_by_profile_id)
overriding system value
select
  970000000000000001,
  'Phase 6 account deletion cascade?',
  profiles.id
from public.profiles as profiles
where profiles.user_id = '30000000-0000-0000-0000-000000000002';

insert into public.group_check_responses (check_id, profile_id, answer)
select 970000000000000001, profiles.id, true
from public.profiles as profiles
where profiles.user_id = '30000000-0000-0000-0000-000000000002';

insert into public.question_rounds (id)
overriding system value
values (970000000000000001);

insert into public.question_submission_limits (round_id, profile_id, submission_count)
select 970000000000000001, profiles.id, 3
from public.profiles as profiles
where profiles.user_id = '30000000-0000-0000-0000-000000000002';

insert into public.role_assignment_audit (
  changed_by_profile_id,
  target_user_id,
  previous_role,
  new_role,
  created_at
)
select
  profiles.id,
  profiles.user_id,
  'user',
  'medical_staff',
  '2000-01-01 00:00:00+00'::timestamptz
from public.profiles as profiles
where profiles.user_id = '30000000-0000-0000-0000-000000000002';

delete from auth.users
where id = '30000000-0000-0000-0000-000000000002';

select is(
  (
    select count(*)
    from auth.users
    where id = '30000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'the requested Auth user is deleted'
);
select is(
  (
    select count(*)
    from public.profiles
    where user_id = '30000000-0000-0000-0000-000000000002'
  ),
  0::bigint,
  'the deleted account profile cascades away'
);
select is(
  (
    select count(*)
    from public.group_check_responses
    where check_id = 970000000000000001
  ),
  0::bigint,
  'dependent group-check responses cascade away'
);
select is(
  (
    select count(*)
    from public.question_submission_limits
    where round_id = 970000000000000001
  ),
  0::bigint,
  'temporary question counters cascade away'
);
select results_eq(
  $$
    select checks.created_by_profile_id
    from public.group_checks as checks
    where checks.id = 970000000000000001
  $$,
  $$ values (null::int8) $$,
  'retained group checks no longer identify the deleted creator profile'
);
select results_eq(
  $$
    select audit.changed_by_profile_id, audit.target_user_id
    from public.role_assignment_audit as audit
    where audit.created_at = '2000-01-01 00:00:00+00'::timestamptz
      and audit.previous_role = 'user'
      and audit.new_role = 'medical_staff'
  $$,
  $$ values (null::int8, null::uuid) $$,
  'retained role audit history is anonymized on both actor and target'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  '30000000-0000-0000-0000-000000000003',
  'phase6-second-admin@example.invalid',
  '{"display_name":"Phase 6 Second Admin"}'::jsonb
);
update public.profiles
set role = 'admin'
where user_id = '30000000-0000-0000-0000-000000000003';

select lives_ok(
  $$
    delete from auth.users
    where id = '30000000-0000-0000-0000-000000000001'
  $$,
  'an administrator can delete their account when another admin remains'
);
select is(
  (select count(*) from public.profiles where role = 'admin'),
  1::bigint,
  'deleting one of two administrators leaves exactly one admin'
);

select * from finish();

rollback;
