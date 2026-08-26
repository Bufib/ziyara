create extension if not exists pgtap with schema extensions;

create temporary table phase6_extension_state (dblink_was_installed boolean not null);
insert into phase6_extension_state
select exists (select 1 from pg_extension where extname = 'dblink');

create extension if not exists dblink with schema extensions;

drop schema if exists phase6_test cascade;
create schema phase6_test;

create function phase6_test.delete_auth_user(
  p_user_id uuid,
  p_hold_seconds double precision
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = p_user_id;
  perform pg_catalog.pg_sleep(p_hold_seconds);
  return 'ok';
exception
  when others then
    return sqlstate;
end;
$$;

update public.profiles
set role = 'user'
where user_id in (
  '31000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000002'
);
delete from auth.users
where id in (
  '31000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000002'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  (
    '31000000-0000-0000-0000-000000000001',
    'phase6-concurrent-delete-a@example.invalid',
    '{"display_name":"Phase 6 Concurrent Delete A"}'::jsonb
  ),
  (
    '31000000-0000-0000-0000-000000000002',
    'phase6-concurrent-delete-b@example.invalid',
    '{"display_name":"Phase 6 Concurrent Delete B"}'::jsonb
  );

update public.profiles
set role = 'admin'
where user_id in (
  '31000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000002'
);

select plan(3);

create temporary table phase6_delete_results (
  connection_name text primary key,
  status text not null
);

do $$
begin
  perform extensions.dblink_connect(
    'phase6_delete_a',
    'host=supabase_db_ziyara port=5432 dbname=postgres user=postgres password=postgres'
  );
  perform extensions.dblink_connect(
    'phase6_delete_b',
    'host=supabase_db_ziyara port=5432 dbname=postgres user=postgres password=postgres'
  );

  perform extensions.dblink_send_query(
    'phase6_delete_a',
    $query$
      select phase6_test.delete_auth_user(
        '31000000-0000-0000-0000-000000000001'::uuid,
        0.5
      )
    $query$
  );
  perform pg_catalog.pg_sleep(0.1);
  perform extensions.dblink_send_query(
    'phase6_delete_b',
    $query$
      select phase6_test.delete_auth_user(
        '31000000-0000-0000-0000-000000000002'::uuid,
        0
      )
    $query$
  );
end;
$$;

insert into phase6_delete_results (connection_name, status)
select 'phase6_delete_a', response.status
from extensions.dblink_get_result('phase6_delete_a') as response(status text);
insert into phase6_delete_results (connection_name, status)
select 'phase6_delete_b', response.status
from extensions.dblink_get_result('phase6_delete_b') as response(status text);

select is(
  (select status from phase6_delete_results where connection_name = 'phase6_delete_a'),
  'ok',
  'the first concurrent administrator deletion commits'
);
select is(
  (select status from phase6_delete_results where connection_name = 'phase6_delete_b'),
  'P0001',
  'the second concurrent deletion cannot remove the remaining administrator'
);
select is(
  (
    select count(*)
    from public.profiles
    where user_id in (
      '31000000-0000-0000-0000-000000000001',
      '31000000-0000-0000-0000-000000000002'
    )
      and role = 'admin'
  ),
  1::bigint,
  'concurrent account deletion leaves exactly one administrator'
);

select * from finish();

do $$
begin
  perform extensions.dblink_disconnect('phase6_delete_a');
  perform extensions.dblink_disconnect('phase6_delete_b');
end;
$$;

update public.profiles
set role = 'user'
where user_id in (
  '31000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000002'
);
delete from auth.users
where id in (
  '31000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000002'
);

drop schema phase6_test cascade;

do $$
begin
  if not (select dblink_was_installed from phase6_extension_state) then
    drop extension dblink;
  end if;
end;
$$;
