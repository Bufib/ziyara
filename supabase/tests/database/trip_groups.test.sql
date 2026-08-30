begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

select is(
  (
    select count(*)
    from information_schema.tables as tables
    where tables.table_schema = 'public'
      and tables.table_name in (
        'trip_groups',
        'trip_group_members',
        'trip_group_location_requests'
      )
  ),
  3::bigint,
  'all trip-group tables exist'
);

select enum_has_labels(
  'public',
  'trip_group_location_status',
  array['pending', 'shared', 'declined'],
  'location requests expose pending, shared and declined states'
);

select results_eq(
  $$
    select tables.table_name::text
    from information_schema.tables as tables
    where tables.table_schema = 'public'
      and tables.table_name like 'trip_group%'
      and has_table_privilege(
        'anon',
        format('%I.%I', tables.table_schema, tables.table_name),
        'select'
      )
  $$,
  $$ select null::text where false $$,
  'anonymous users have no read grants on trip-group tables'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.respond_to_trip_group_location(bigint,boolean,double precision,double precision,double precision)',
    'execute'
  ),
  'anonymous users cannot answer location requests'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '70000000-0000-0000-0000-000000000001',
    'trip-group-admin@example.invalid',
    '{"display_name":"Group Admin"}'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    'trip-group-leader@example.invalid',
    '{"display_name":"Group Leader"}'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000003',
    'trip-group-member@example.invalid',
    '{"display_name":"Group Member"}'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000004',
    'trip-group-outsider@example.invalid',
    '{"display_name":"Group Outsider"}'::jsonb
  );

update public.profiles
set role = 'admin'
where user_id = '70000000-0000-0000-0000-000000000001';

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$
    select public.admin_upsert_trip_group(
      1,
      'Nicht erlaubt',
      1,
      array[1]::int8[],
      null
    )
  $$,
  '42501',
  'Admin access required.',
  'a normal user cannot create a group'
);

reset role;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$ select public.admin_create_trip('Trip Group Test Trip') $$,
  'an admin creates the active trip'
);

select lives_ok(
  $$
    select public.admin_create_trip_bus(
      (select id from public.trips where name = 'Trip Group Test Trip'),
      'Bus 1'
    )
  $$,
  'an admin creates a bus'
);

select lives_ok(
  $$
    select public.admin_upsert_trip_participant(
      (select id from public.trips where name = 'Trip Group Test Trip'),
      'GRP00',
      'Group Admin',
      '70000000-0000-0000-0000-000000000001',
      (select id from public.trip_buses where name = 'Bus 1')
    )
  $$,
  'an admin can also have a linked physical participant ID'
);

select lives_ok(
  $$
    select public.admin_upsert_trip_participant(
      (select id from public.trips where name = 'Trip Group Test Trip'),
      'GRP01',
      'Group Leader',
      '70000000-0000-0000-0000-000000000002',
      (select id from public.trip_buses where name = 'Bus 1')
    )
  $$,
  'the leader participant is linked to an app account'
);

select lives_ok(
  $$
    select public.admin_upsert_trip_participant(
      (select id from public.trips where name = 'Trip Group Test Trip'),
      'GRP02',
      'Group Member',
      '70000000-0000-0000-0000-000000000003',
      (select id from public.trip_buses where name = 'Bus 1')
    )
  $$,
  'a second participant is linked to an app account'
);

select lives_ok(
  $$
    select public.admin_upsert_trip_participant(
      (select id from public.trips where name = 'Trip Group Test Trip'),
      'GRP03',
      'Physical Member',
      null,
      (select id from public.trip_buses where name = 'Bus 1')
    )
  $$,
  'an unlinked physical participant can be a normal member'
);

select lives_ok(
  $$
    select public.admin_upsert_trip_group(
      (select id from public.trips where name = 'Trip Group Test Trip'),
      'Gruppe Abbas',
      (select id from public.trip_participants where participant_code = 'GRP01'),
      array(
        select id
        from public.trip_participants
        where participant_code in ('GRP00', 'GRP01', 'GRP02', 'GRP03')
        order by participant_code
      ),
      null
    )
  $$,
  'an admin creates a group with a linked leader and three members'
);

select is(
  (select count(*) from public.trip_group_members),
  4::bigint,
  'all selected physical participants are group members'
);

select ok(
  exists (
    select 1
    from public.trip_groups as groups
    join public.trip_group_members as members
      on members.group_id = groups.id
      and members.participant_id = groups.leader_participant_id
  ),
  'the group leader is also a group member'
);

select throws_ok(
  $$
    select public.admin_upsert_trip_group(
      (select id from public.trips where name = 'Trip Group Test Trip'),
      'Ungültige Gruppe',
      (select id from public.trip_participants where participant_code = 'GRP03'),
      array[(select id from public.trip_participants where participant_code = 'GRP03')],
      null
    )
  $$,
  '23503',
  'The group leader must have a linked app account.',
  'an unlinked physical participant cannot become the leader'
);

select lives_ok(
  $$
    select public.admin_request_trip_group_location(
      (select id from public.trip_groups where name = 'Gruppe Abbas')
    )
  $$,
  'an admin requests the group leader location'
);

select is(
  (select status::text from public.trip_group_location_requests),
  'pending',
  'the request starts as pending'
);

reset role;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000003', true);
set local role authenticated;

select is(
  (select count(*) from public.trip_groups),
  1::bigint,
  'a normal group member can read their group'
);

select is(
  (select count(*) from public.trip_group_members),
  4::bigint,
  'a group member can read the complete member assignment'
);

select is(
  (select count(*) from public.get_trip_group_member_summaries()),
  4::bigint,
  'the member-summary RPC returns the names needed by the group screen'
);

select is(
  (select count(*) from public.trip_group_location_requests),
  0::bigint,
  'a normal group member cannot read the leader location request'
);

select throws_ok(
  $$
    select public.respond_to_trip_group_location(
      (select id from public.trip_group_location_requests),
      true,
      32.61,
      44.03,
      25
    )
  $$,
  'P0002',
  'Pending location request for the current group leader not found.',
  'a normal member cannot answer for the leader'
);

reset role;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000004', true);
set local role authenticated;

select is(
  (select count(*) from public.trip_groups),
  0::bigint,
  'an outsider cannot read another group'
);

reset role;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select is(
  (select count(*) from public.trip_group_location_requests where status = 'pending'),
  1::bigint,
  'the group leader can read the pending location request'
);

select lives_ok(
  $$
    select public.respond_to_trip_group_location(
      (select id from public.trip_group_location_requests where status = 'pending'),
      true,
      32.61,
      44.03,
      25
    )
  $$,
  'the leader explicitly shares one location'
);

select is(
  (
    select count(*)
    from public.trip_group_location_requests
    where status = 'shared'
      and latitude = 32.61
      and longitude = 44.03
      and location_expires_at > now()
  ),
  1::bigint,
  'the shared coordinates are time-limited'
);

reset role;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (select count(*) from public.trip_group_location_requests where status = 'shared'),
  1::bigint,
  'the admin can read the current shared leader location'
);

reset role;
update public.trip_group_location_requests
set location_expires_at = now() - interval '1 second';
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select is(
  (select count(*) from public.trip_group_location_requests),
  0::bigint,
  'RLS hides shared coordinates after the fifteen-minute visibility window'
);

select lives_ok(
  $$
    select public.admin_request_trip_group_location(
      (select id from public.trip_groups where name = 'Gruppe Abbas')
    )
  $$,
  'a new request replaces the previous coordinates'
);

select is(
  (
    select count(*)
    from public.trip_group_location_requests
    where status = 'pending'
      and latitude is null
      and longitude is null
  ),
  1::bigint,
  're-requesting clears previously shared coordinates'
);

select lives_ok(
  $$
    select public.admin_upsert_trip_group(
      (select id from public.trips where name = 'Trip Group Test Trip'),
      'Gruppe Abbas aktualisiert',
      (select id from public.trip_participants where participant_code = 'GRP01'),
      array[
        (select id from public.trip_participants where participant_code = 'GRP01'),
        (select id from public.trip_participants where participant_code = 'GRP02')
      ],
      (select id from public.trip_groups where name = 'Gruppe Abbas')
    )
  $$,
  'an admin can update the group membership atomically'
);

select is(
  (select count(*) from public.trip_group_members),
  2::bigint,
  'the updated group has exactly the selected members'
);

select is(
  (select count(*) from public.trip_group_location_requests),
  0::bigint,
  'editing a group removes its old location request and coordinates'
);

select lives_ok(
  $$
    select public.admin_delete_trip_group(
      (select id from public.trip_groups where name = 'Gruppe Abbas aktualisiert')
    )
  $$,
  'an admin can delete the group'
);

select is(
  (select count(*) from public.trip_groups),
  0::bigint,
  'deleting the group removes its assignment'
);

select * from finish();
rollback;
