create extension if not exists pgtap with schema extensions;

create temporary table phase8_extension_state (dblink_was_installed boolean not null);
insert into phase8_extension_state
select exists (select 1 from pg_extension where extname = 'dblink');

create extension if not exists dblink with schema extensions;

drop schema if exists phase8_test cascade;
create schema phase8_test;

create function phase8_test.respond_as(
  p_user_id uuid,
  p_boarding_id int8,
  p_participant_id int8,
  p_hold_seconds double precision
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, true);
  perform public.respond_to_bus_boarding(p_boarding_id, p_participant_id, 'read');
  perform public.respond_to_bus_boarding(p_boarding_id, p_participant_id, 'on_way');
  perform public.respond_to_bus_boarding(p_boarding_id, p_participant_id, 'boarded');
  perform pg_catalog.pg_sleep(p_hold_seconds);
  return 'ok';
exception
  when others then
    return sqlstate;
end;
$$;

create function phase8_test.close_as(
  p_admin_user_id uuid,
  p_boarding_id int8,
  p_hold_seconds double precision
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claim.sub', p_admin_user_id::text, true);
  perform public.admin_close_bus_boarding(p_boarding_id);
  perform pg_catalog.pg_sleep(p_hold_seconds);
  return 'ok';
exception
  when others then
    return sqlstate;
end;
$$;

delete from public.trips;
update public.profiles
set role = 'user'
where user_id in (
  '41000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000002'
);
delete from auth.users
where id in (
  '41000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000002'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '41000000-0000-0000-0000-000000000001',
    'phase8-concurrent-admin@example.invalid',
    '{"display_name":"Phase 8 Concurrent Admin"}'::jsonb
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    'phase8-concurrent-user@example.invalid',
    '{"display_name":"Phase 8 Concurrent User"}'::jsonb
  );

update public.profiles
set role = 'admin'
where user_id = '41000000-0000-0000-0000-000000000001';

insert into public.trips (id, name, created_by_profile_id)
overriding system value
select
  980000000000000001,
  'Phase 8 Concurrent Trip',
  profiles.id
from public.profiles as profiles
where profiles.user_id = '41000000-0000-0000-0000-000000000001';

insert into public.trip_buses (id, trip_id, name)
overriding system value
values (980000000000000001, 980000000000000001, 'Bus 1');

insert into public.trip_participants (
  id,
  trip_id,
  bus_id,
  profile_id,
  participant_code,
  display_name
)
overriding system value
select
  980000000000000001,
  980000000000000001,
  980000000000000001,
  profiles.id,
  'BER01',
  'Phase 8 Concurrent Participant'
from public.profiles as profiles
where profiles.user_id = '41000000-0000-0000-0000-000000000002';

insert into public.bus_boardings (
  id,
  trip_id,
  title,
  departure_at,
  created_by_profile_id
)
overriding system value
select
  980000000000000001,
  980000000000000001,
  'Phase 8 Response First',
  now() + interval '15 minutes',
  profiles.id
from public.profiles as profiles
where profiles.user_id = '41000000-0000-0000-0000-000000000001';

select plan(7);

create temporary table phase8_first_results (
  connection_name text primary key,
  status text not null
);

do $$
begin
  perform extensions.dblink_connect(
    'phase8_respond_first',
    'host=supabase_db_ziyara port=5432 dbname=postgres user=postgres password=postgres'
  );
  perform extensions.dblink_connect(
    'phase8_close_second',
    'host=supabase_db_ziyara port=5432 dbname=postgres user=postgres password=postgres'
  );
  perform extensions.dblink_send_query(
    'phase8_respond_first',
    $query$select phase8_test.respond_as(
      '41000000-0000-0000-0000-000000000002'::uuid,
      980000000000000001,
      980000000000000001,
      0.5
    )$query$
  );
  perform pg_catalog.pg_sleep(0.1);
  perform extensions.dblink_send_query(
    'phase8_close_second',
    $query$select phase8_test.close_as(
      '41000000-0000-0000-0000-000000000001'::uuid,
      980000000000000001,
      0
    )$query$
  );
end;
$$;

insert into phase8_first_results (connection_name, status)
select 'respond', response.status
from extensions.dblink_get_result('phase8_respond_first') as response(status text);
insert into phase8_first_results (connection_name, status)
select 'close', response.status
from extensions.dblink_get_result('phase8_close_second') as response(status text);

select is(
  (select status from phase8_first_results where connection_name = 'respond'),
  'ok',
  'a response that locks the open boarding commits'
);
select is(
  (select status from phase8_first_results where connection_name = 'close'),
  'ok',
  'a concurrent close waits and then commits'
);
select is(
  (
    select count(*)
    from public.bus_boarding_responses
    where boarding_id = 980000000000000001
      and status = 'boarded'
  ),
  1::bigint,
  'the committed pre-close response is retained'
);
select isnt(
  (select closed_at from public.bus_boardings where id = 980000000000000001),
  null::timestamptz,
  'the first boarding is closed'
);

insert into public.bus_boardings (
  id,
  trip_id,
  title,
  departure_at,
  created_by_profile_id
)
overriding system value
select
  980000000000000002,
  980000000000000001,
  'Phase 8 Close First',
  now() + interval '30 minutes',
  profiles.id
from public.profiles as profiles
where profiles.user_id = '41000000-0000-0000-0000-000000000001';

create temporary table phase8_second_results (
  connection_name text primary key,
  status text not null
);

do $$
begin
  perform extensions.dblink_connect(
    'phase8_close_first',
    'host=supabase_db_ziyara port=5432 dbname=postgres user=postgres password=postgres'
  );
  perform extensions.dblink_connect(
    'phase8_respond_second',
    'host=supabase_db_ziyara port=5432 dbname=postgres user=postgres password=postgres'
  );
  perform extensions.dblink_send_query(
    'phase8_close_first',
    $query$select phase8_test.close_as(
      '41000000-0000-0000-0000-000000000001'::uuid,
      980000000000000002,
      0.5
    )$query$
  );
  perform pg_catalog.pg_sleep(0.1);
  perform extensions.dblink_send_query(
    'phase8_respond_second',
    $query$select phase8_test.respond_as(
      '41000000-0000-0000-0000-000000000002'::uuid,
      980000000000000002,
      980000000000000001,
      0
    )$query$
  );
end;
$$;

insert into phase8_second_results (connection_name, status)
select 'close', response.status
from extensions.dblink_get_result('phase8_close_first') as response(status text);
insert into phase8_second_results (connection_name, status)
select 'respond', response.status
from extensions.dblink_get_result('phase8_respond_second') as response(status text);

select is(
  (select status from phase8_second_results where connection_name = 'close'),
  'ok',
  'a close that locks the boarding commits'
);
select is(
  (select status from phase8_second_results where connection_name = 'respond'),
  'P0002',
  'a response waiting behind the close is rejected'
);
select is(
  (
    select count(*)
    from public.bus_boarding_responses
    where boarding_id = 980000000000000002
  ),
  0::bigint,
  'no response is written after the concurrent close'
);

select * from finish();

do $$
declare
  connection_name text;
begin
  foreach connection_name in array array[
    'phase8_respond_first',
    'phase8_close_second',
    'phase8_close_first',
    'phase8_respond_second'
  ] loop
    perform extensions.dblink_disconnect(connection_name);
  end loop;
end;
$$;

delete from public.trips where id = 980000000000000001;
update public.profiles
set role = 'user'
where user_id in (
  '41000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000002'
);
delete from auth.users
where id in (
  '41000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000002'
);

drop schema phase8_test cascade;

do $$
begin
  if not (select dblink_was_installed from phase8_extension_state) then
    drop extension dblink;
  end if;
end;
$$;
