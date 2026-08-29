begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select has_table(
  'public',
  'trip_daily_programs',
  'the daily-program table exists'
);

select ok(
  not has_table_privilege('anon', 'public.trip_daily_programs', 'select'),
  'anonymous users cannot read daily programs'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_upsert_trip_daily_programs(bigint,jsonb)',
    'execute'
  ),
  'anonymous users cannot publish daily programs'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.can_read_current_trip_daily_program(bigint)',
    'execute'
  ),
  'anonymous users cannot call the daily-program read helper'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '70000000-0000-0000-0000-000000000001',
    'daily-program-admin@example.invalid',
    '{"display_name":"Daily Program Admin"}'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    'daily-program-user@example.invalid',
    '{"display_name":"Daily Program User"}'::jsonb
  );

update public.profiles
set role = 'admin'
where user_id = '70000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$
    select public.admin_upsert_trip_daily_programs(
      1,
      jsonb_build_array(
        jsonb_build_object(
          'program_date', current_date,
          'title', 'Nicht erlaubt',
          'details', 'Darf nicht gespeichert werden'
        )
      )
    )
  $$,
  '42501',
  'Admin access required.',
  'a normal user cannot publish daily programs'
);

reset role;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$ select public.admin_create_trip('Daily Program Trip') $$,
  'an admin creates the active trip'
);

select lives_ok(
  $$
    select public.admin_upsert_trip_daily_programs(
      (select id from public.trips where name = 'Daily Program Trip'),
      jsonb_build_array(
        jsonb_build_object(
          'program_date', current_date,
          'title', 'Tag eins',
          'details', '08:00 Start'
        ),
        jsonb_build_object(
          'program_date', current_date + 1,
          'title', 'Tag zwei',
          'details', '09:00 Abfahrt'
        ),
        jsonb_build_object(
          'program_date', current_date + 2,
          'title', '',
          'details', '10:00 Treffpunkt'
        )
      )
    )
  $$,
  'an admin publishes three daily programs in one transaction'
);

select is(
  (select count(*) from public.trip_daily_programs),
  3::bigint,
  'the batch creates one row per date'
);
select is(
  (
    select title
    from public.trip_daily_programs
    where program_date = current_date + 2
  ),
  null::text,
  'an empty optional heading is normalized to null'
);

reset role;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select is(
  (select count(*) from public.trip_daily_programs),
  3::bigint,
  'every authenticated user can read the current trip program without a bus assignment'
);
select ok(
  public.can_read_current_trip_daily_program(
    (select trip_id from public.trip_daily_programs limit 1)
  ),
  'the read helper recognizes the current trip for an authenticated user'
);

reset role;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$
    select public.admin_upsert_trip_daily_programs(
      (select id from public.trips where name = 'Daily Program Trip'),
      jsonb_build_array(
        jsonb_build_object(
          'program_date', current_date + 1,
          'title', 'Tag zwei geändert',
          'details', '11:00 Neue Abfahrt'
        )
      )
    )
  $$,
  'an admin can update one already-published date'
);
select is(
  (select count(*) from public.trip_daily_programs),
  3::bigint,
  'updating a date does not create a duplicate'
);
select is(
  (
    select details
    from public.trip_daily_programs
    where program_date = current_date + 1
  ),
  '11:00 Neue Abfahrt',
  'the edited program is stored for that date'
);

select * from finish();
rollback;
