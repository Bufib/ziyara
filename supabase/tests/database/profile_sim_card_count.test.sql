begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

select has_column(
  'public',
  'profiles',
  'sim_card_count',
  'profiles store the number of required SIM cards'
);
select ok(
  not has_column_privilege('anon', 'public.profiles', 'sim_card_count', 'update'),
  'anonymous callers cannot update SIM-card counts'
);
select ok(
  has_column_privilege('authenticated', 'public.profiles', 'sim_card_count', 'update'),
  'authenticated callers receive the narrow SIM-card update grant'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '72000000-0000-0000-0000-000000000001',
    'sim-admin@example.invalid',
    '{"display_name":"SIM Admin","member_type":"brother","sim_card_count":1}'::jsonb
  ),
  (
    '72000000-0000-0000-0000-000000000002',
    'sim-user-one@example.invalid',
    '{"display_name":"SIM User One","member_type":"sister","sim_card_count":4}'::jsonb
  ),
  (
    '72000000-0000-0000-0000-000000000003',
    'sim-user-two@example.invalid',
    '{"display_name":"SIM User Two"}'::jsonb
  ),
  (
    '72000000-0000-0000-0000-000000000004',
    'sim-user-three@example.invalid',
    '{"display_name":"SIM User Three","sim_card_count":99}'::jsonb
  );

update public.profiles
set role = 'admin'
where user_id = '72000000-0000-0000-0000-000000000001';

select is(
  (
    select sim_card_count
    from public.profiles
    where user_id = '72000000-0000-0000-0000-000000000002'
  ),
  4::bigint,
  'registration metadata stores a valid SIM-card count'
);
select is(
  (
    select sim_card_count
    from public.profiles
    where user_id = '72000000-0000-0000-0000-000000000003'
  ),
  0::bigint,
  'accounts without SIM-card metadata start at zero'
);
select is(
  (
    select sim_card_count
    from public.profiles
    where user_id = '72000000-0000-0000-0000-000000000004'
  ),
  50::bigint,
  'registration metadata is clamped to the server-side SIM-card limit'
);

select set_config('request.jwt.claim.sub', '72000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$ select * from public.admin_list_users() $$,
  '42501',
  'Admin access required.',
  'a normal user cannot read SIM-card and gender details through the admin RPC'
);
select lives_ok(
  $$
    update public.profiles
    set sim_card_count = 5
    where user_id = '72000000-0000-0000-0000-000000000002'
  $$,
  'a user can update their own SIM-card count'
);
select is(
  (
    select sim_card_count
    from public.profiles
    where user_id = '72000000-0000-0000-0000-000000000002'
  ),
  5::bigint,
  'the own SIM-card update is stored'
);
select results_eq(
  $$
    update public.profiles
    set sim_card_count = 8
    where user_id = '72000000-0000-0000-0000-000000000003'
    returning user_id
  $$,
  $$ select null::uuid where false $$,
  'a user cannot update another account SIM-card count'
);
select throws_ok(
  $$
    update public.profiles
    set sim_card_count = 51
    where user_id = '72000000-0000-0000-0000-000000000002'
  $$,
  '23514',
  null,
  'the database rejects SIM-card counts above the supported range'
);

reset role;
select set_config('request.jwt.claim.sub', '72000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select results_eq(
  $$
    select listed.user_id, listed.member_type, listed.sim_card_count
    from public.admin_list_users() as listed
    where listed.user_id = '72000000-0000-0000-0000-000000000002'
  $$,
  $$
    values (
      '72000000-0000-0000-0000-000000000002'::uuid,
      'sister'::public.member_type,
      5::bigint
    )
  $$,
  'the minimal admin list exposes member type and SIM-card count'
);

select ok(
  not has_function_privilege('anon', 'public.admin_list_users()', 'execute'),
  'anonymous callers cannot execute the admin list RPC'
);

select * from finish();

rollback;
