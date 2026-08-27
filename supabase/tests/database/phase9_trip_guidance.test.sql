begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

select ok(
  (
    select count(*) = 2
    from information_schema.tables as tables
    where tables.table_schema = 'public'
      and tables.table_name in ('trip_guidance_updates', 'trip_guidance_responses')
  ),
  'both trip-guidance tables exist'
);
select enum_has_labels(
  'public',
  'trip_guidance_status',
  array['on_way', 'almost_there', 'at_meeting_point', 'problem', 'lost', 'medical_help'],
  'trip guidance exposes all six participant states'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '50000000-0000-0000-0000-000000000001',
    'phase9-guidance-admin@example.invalid',
    '{"display_name":"Leiter 2"}'::jsonb
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    'phase9-guidance-user@example.invalid',
    '{"display_name":"Phase 9 User"}'::jsonb
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    'phase9-guidance-other@example.invalid',
    '{"display_name":"Phase 9 Other"}'::jsonb
  );

update public.profiles
set role = 'admin'
where user_id = '50000000-0000-0000-0000-000000000001';

select results_eq(
  $$
    select tables.table_name::text
    from information_schema.tables as tables
    where tables.table_schema = 'public'
      and tables.table_name in ('trip_guidance_updates', 'trip_guidance_responses')
      and has_table_privilege(
        'anon',
        format('%I.%I', tables.table_schema, tables.table_name),
        'select'
      )
  $$,
  $$ select null::text where false $$,
  'anonymous users have no read grant on trip-guidance tables'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.respond_to_trip_guidance(bigint,bigint,public.trip_guidance_status)',
    'execute'
  ),
  'anonymous users cannot submit a guidance status'
);

select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select throws_ok(
  $$
    select public.admin_publish_trip_guidance(
      1,
      'Ort',
      null,
      null,
      null,
      'Nächster Ort',
      now() + interval '30 minutes',
      'Treffpunkt',
      null,
      null,
      null,
      null,
      null,
      null
    )
  $$,
  '42501',
  'Admin access required.',
  'a normal user cannot publish trip guidance'
);

reset role;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$ select public.admin_create_trip('Phase 9 Guidance Trip') $$,
  'an admin creates the active trip'
);
select lives_ok(
  $$
    select public.admin_create_trip_bus(
      (select id from public.trips where name = 'Phase 9 Guidance Trip'),
      'Bus 1'
    )
  $$,
  'an admin creates a bus'
);
select lives_ok(
  $$
    select public.admin_upsert_trip_participant(
      (select id from public.trips where name = 'Phase 9 Guidance Trip'),
      'BER01',
      'Guidance Participant',
      '50000000-0000-0000-0000-000000000002',
      (select id from public.trip_buses where name = 'Bus 1')
    )
  $$,
  'an admin links the reporting participant'
);
select lives_ok(
  $$
    select public.admin_upsert_trip_participant(
      (select id from public.trips where name = 'Phase 9 Guidance Trip'),
      'BER02',
      'Other Participant',
      '50000000-0000-0000-0000-000000000003',
      (select id from public.trip_buses where name = 'Bus 1')
    )
  $$,
  'an admin links a second participant'
);
select lives_ok(
  $$
    select public.admin_publish_trip_guidance(
      (select id from public.trips where name = 'Phase 9 Guidance Trip'),
      'Imam-Hussain-Schrein',
      'shrine-imam-hussain',
      32.616,
      44.032,
      'Abfahrt nach Najaf',
      now() + interval '30 minutes',
      'Tor 3',
      32.6161,
      44.0321,
      'Tür 3',
      'etwa 300 m',
      'Organisatorischer Hinweis',
      null
    )
  $$,
  'an admin publishes the current itinerary point'
);
select is(
  (select count(*) from public.trip_guidance_updates where closed_at is null),
  1::bigint,
  'exactly one guidance update is active'
);

reset role;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select is(
  (select count(*) from public.trip_guidance_updates where closed_at is null),
  1::bigint,
  'a linked participant can read the current guidance'
);
select lives_ok(
  $$
    select public.respond_to_trip_guidance(
      (select id from public.trip_guidance_updates where closed_at is null),
      (select id from public.trip_participants where participant_code = 'BER01'),
      'problem'::public.trip_guidance_status
    )
  $$,
  'a participant reports a problem'
);
select throws_ok(
  $$
    select public.respond_to_trip_guidance(
      (select id from public.trip_guidance_updates where closed_at is null),
      (select id from public.trip_participants where participant_code = 'BER02'),
      'on_way'::public.trip_guidance_status
    )
  $$,
  '42501',
  'Participant is not linked to the current user.',
  'a participant cannot report for another physical ID'
);
select is(
  (select count(*) from public.trip_guidance_responses),
  1::bigint,
  'a participant reads only their own guidance response'
);

reset role;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$
    select public.admin_acknowledge_trip_guidance_problem(
      (select id from public.trip_guidance_responses where status = 'problem')
    )
  $$,
  'an admin explicitly accepts the problem report'
);
select is(
  (
    select acknowledged_by_display_name
    from public.trip_guidance_responses
    where status = 'problem'
  ),
  'Leiter 2',
  'the reporting participant can be shown the leader name'
);
select lives_ok(
  $$
    select public.admin_update_trip_guidance(
      (select id from public.trip_guidance_updates where closed_at is null),
      'Imam-Hussain-Schrein',
      'shrine-imam-hussain',
      32.616,
      44.032,
      'Abfahrt nach Najaf',
      now() + interval '40 minutes',
      'Neuer Treffpunkt am Tor 4',
      32.6162,
      44.0322,
      'Tür 4',
      'etwa 350 m',
      'Kurzfristig geändert',
      null
    )
  $$,
  'an admin updates the meeting point without starting a new itinerary point'
);
select is(
  (select meeting_point from public.trip_guidance_updates where closed_at is null),
  'Neuer Treffpunkt am Tor 4',
  'the active meeting point changes in place'
);
select is(
  (select count(*) from public.trip_guidance_responses where status = 'problem'),
  1::bigint,
  'a short-notice meeting-point edit preserves participant reports'
);
select lives_ok(
  $$
    select public.admin_publish_trip_guidance(
      (select id from public.trips where name = 'Phase 9 Guidance Trip'),
      'Najaf',
      null,
      32.0,
      44.3,
      'Hotel',
      now() + interval '60 minutes',
      'Busparkplatz',
      32.01,
      44.31,
      null,
      null,
      null,
      null
    )
  $$,
  'publishing a new itinerary point closes the previous one'
);
select is(
  (select count(*) from public.trip_guidance_updates where closed_at is not null),
  1::bigint,
  'the previous itinerary point is retained as closed history'
);
select is(
  (select current_place_name from public.trip_guidance_updates where closed_at is null),
  'Najaf',
  'the newly published itinerary point is current'
);
select is(
  (
    select count(*)
    from public.trip_guidance_responses as responses
    join public.trip_guidance_updates as guidance on guidance.id = responses.guidance_id
    where guidance.closed_at is null
  ),
  0::bigint,
  'a new itinerary point starts without old status reports'
);

select * from finish();
rollback;
