begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

select has_table(
  'public',
  'account_families',
  'account families have their own application table'
);
select has_column(
  'public',
  'profiles',
  'luggage_count',
  'profiles store a suitcase count'
);
select has_column(
  'public',
  'profiles',
  'family_id',
  'profiles can be assigned to one account family'
);

select ok(
  not has_table_privilege('anon', 'public.account_families', 'select'),
  'anonymous callers cannot read account families'
);
select ok(
  not has_function_privilege('anon', 'public.admin_list_account_families()', 'execute'),
  'anonymous callers cannot list account families through the admin RPC'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_upsert_account_family(text,uuid[],bigint)',
    'execute'
  ),
  'anonymous callers cannot create or update account families'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_delete_account_family(bigint)',
    'execute'
  ),
  'anonymous callers cannot delete account families'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '71000000-0000-0000-0000-000000000001',
    'family-admin@example.invalid',
    '{"display_name":"Family Admin","luggage_count":2}'::jsonb
  ),
  (
    '71000000-0000-0000-0000-000000000002',
    'family-user-one@example.invalid',
    '{"display_name":"Family User One","luggage_count":3}'::jsonb
  ),
  (
    '71000000-0000-0000-0000-000000000003',
    'family-user-two@example.invalid',
    '{"display_name":"Family User Two"}'::jsonb
  ),
  (
    '71000000-0000-0000-0000-000000000004',
    'family-user-three@example.invalid',
    '{"display_name":"Family User Three","luggage_count":99}'::jsonb
  );

update public.profiles
set role = 'admin'
where user_id = '71000000-0000-0000-0000-000000000001';

select is(
  (
    select luggage_count
    from public.profiles
    where user_id = '71000000-0000-0000-0000-000000000002'
  ),
  3::bigint,
  'registration metadata stores a valid suitcase count'
);
select is(
  (
    select luggage_count
    from public.profiles
    where user_id = '71000000-0000-0000-0000-000000000003'
  ),
  0::bigint,
  'accounts without suitcase metadata start at zero'
);
select is(
  (
    select luggage_count
    from public.profiles
    where user_id = '71000000-0000-0000-0000-000000000004'
  ),
  50::bigint,
  'registration metadata is clamped to the server-side suitcase limit'
);

select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$ select * from public.admin_list_account_families() $$,
  '42501',
  'Admin access required.',
  'a normal user cannot list families through the admin RPC'
);
select throws_ok(
  $$
    select public.admin_upsert_account_family(
      'Nicht erlaubt',
      array['71000000-0000-0000-0000-000000000002'::uuid],
      null
    )
  $$,
  '42501',
  'Admin access required.',
  'a normal user cannot create a family'
);
select throws_ok(
  $$ select public.admin_delete_account_family(1) $$,
  '42501',
  'Admin access required.',
  'a normal user cannot delete a family'
);
select lives_ok(
  $$
    update public.profiles
    set luggage_count = 4
    where user_id = '71000000-0000-0000-0000-000000000002'
  $$,
  'a user can update their own suitcase count'
);
select is(
  (
    select luggage_count
    from public.profiles
    where user_id = '71000000-0000-0000-0000-000000000002'
  ),
  4::bigint,
  'the own suitcase update is stored'
);
select results_eq(
  $$
    update public.profiles
    set luggage_count = 8
    where user_id = '71000000-0000-0000-0000-000000000003'
    returning user_id
  $$,
  $$ select null::uuid where false $$,
  'a user cannot update another account suitcase count'
);
select throws_ok(
  $$
    update public.profiles
    set family_id = null
    where user_id = '71000000-0000-0000-0000-000000000002'
  $$,
  '42501',
  'permission denied for table profiles',
  'users cannot change their own admin-managed family assignment'
);

reset role;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (select count(*) from public.admin_list_account_families()),
  0::bigint,
  'the admin family list starts empty'
);
select lives_ok(
  $$
    select public.admin_upsert_account_family(
      'Familie Alpha',
      array[
        '71000000-0000-0000-0000-000000000002'::uuid,
        '71000000-0000-0000-0000-000000000003'::uuid
      ],
      null
    )
  $$,
  'an admin creates a family with two user accounts'
);
select is(
  (select count(*) from public.account_families),
  1::bigint,
  'one family row is stored'
);
select is(
  (
    select count(*)
    from public.profiles
    where family_id = (
      select id from public.account_families where name = 'Familie Alpha'
    )
  ),
  2::bigint,
  'both selected accounts are assigned to the family'
);
select results_eq(
  $$
    select listed.user_id, listed.luggage_count, listed.family_name
    from public.admin_list_users() as listed
    where listed.user_id = '71000000-0000-0000-0000-000000000002'
  $$,
  $$
    values (
      '71000000-0000-0000-0000-000000000002'::uuid,
      4::bigint,
      'Familie Alpha'::text
    )
  $$,
  'the minimal admin user list exposes suitcase count and family assignment'
);
select results_eq(
  $$ select name from public.admin_list_account_families() $$,
  $$ values ('Familie Alpha'::text) $$,
  'the admin family RPC lists the saved family'
);

reset role;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select results_eq(
  $$ select name from public.account_families $$,
  $$ values ('Familie Alpha'::text) $$,
  'an assigned user can read the name of their own family'
);

reset role;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000004', true);
set local role authenticated;

select is(
  (select count(*) from public.account_families),
  0::bigint,
  'an unassigned user cannot read other families'
);
select throws_ok(
  $$ insert into public.account_families (name) values ('Direkter Schreibversuch') $$,
  '42501',
  'permission denied for table account_families',
  'authenticated users cannot write families directly'
);

reset role;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$
    select public.admin_upsert_account_family(
      'Familie Beta',
      array['71000000-0000-0000-0000-000000000004'::uuid],
      null
    )
  $$,
  'an admin creates a second family'
);
select lives_ok(
  $$
    select public.admin_upsert_account_family(
      'Familie Alpha Neu',
      array[
        '71000000-0000-0000-0000-000000000003'::uuid,
        '71000000-0000-0000-0000-000000000004'::uuid
      ],
      (select id from public.account_families where name = 'Familie Alpha')
    )
  $$,
  'editing a family atomically removes and moves account assignments'
);
select results_eq(
  $$
    select profiles.user_id, families.name
    from public.profiles as profiles
    left join public.account_families as families on families.id = profiles.family_id
    where profiles.user_id in (
      '71000000-0000-0000-0000-000000000002',
      '71000000-0000-0000-0000-000000000003',
      '71000000-0000-0000-0000-000000000004'
    )
    order by profiles.user_id
  $$,
  $$
    values
      ('71000000-0000-0000-0000-000000000002'::uuid, null::text),
      ('71000000-0000-0000-0000-000000000003'::uuid, 'Familie Alpha Neu'::text),
      ('71000000-0000-0000-0000-000000000004'::uuid, 'Familie Alpha Neu'::text)
  $$,
  'each account belongs to at most one family after reassignment'
);
select lives_ok(
  $$
    select public.admin_delete_account_family(
      (select id from public.account_families where name = 'Familie Alpha Neu')
    )
  $$,
  'an admin deletes a family'
);
select is(
  (
    select count(*)
    from public.profiles
    where user_id in (
      '71000000-0000-0000-0000-000000000003',
      '71000000-0000-0000-0000-000000000004'
    )
      and family_id is not null
  ),
  0::bigint,
  'deleting a family keeps profiles and clears their assignments'
);
select results_eq(
  $$ select name from public.account_families order by name $$,
  $$ values ('Familie Beta'::text) $$,
  'unrelated families remain after deletion'
);

select * from finish();

rollback;
