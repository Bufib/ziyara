create table public.trip_daily_programs (
  id int8 generated always as identity primary key,
  trip_id int8 not null references public.trips (id) on delete cascade,
  program_date date not null,
  title text check (
    title is null or char_length(btrim(title)) between 2 and 120
  ),
  details text not null
    check (char_length(btrim(details)) between 2 and 4000),
  published_by_profile_id int8 references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, program_date)
);

create index trip_daily_programs_date_idx
on public.trip_daily_programs (program_date, trip_id);

comment on table public.trip_daily_programs is
  'One published daily itinerary per date for a trip, visible on participant home screens.';

create trigger set_trip_daily_programs_updated_at
before update on public.trip_daily_programs
for each row execute function public.set_trip_guidance_updated_at();

alter table public.trip_daily_programs enable row level security;

revoke all on table public.trip_daily_programs from anon, authenticated;
grant select on table public.trip_daily_programs to authenticated;

create or replace function public.can_read_current_trip_daily_program(p_trip_id int8)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.trips as trips
      where trips.id = p_trip_id
        and trips.archived_at is null
    );
$$;

revoke all on function public.can_read_current_trip_daily_program(int8) from public, anon;
grant execute on function public.can_read_current_trip_daily_program(int8) to authenticated;

create policy "Authenticated users can read the current trip daily program"
on public.trip_daily_programs
for select
to authenticated
using ((select public.can_read_current_trip_daily_program(trip_id)));

create or replace function public.admin_upsert_trip_daily_programs(
  p_trip_id int8,
  p_programs jsonb
)
returns setof public.trip_daily_programs
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  program_count int;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_programs is null or jsonb_typeof(p_programs) <> 'array' then
    raise exception 'Daily programs must be a JSON array.' using errcode = '22023';
  end if;

  program_count := jsonb_array_length(p_programs);
  if program_count < 1 or program_count > 14 then
    raise exception 'Between one and fourteen daily programs are required.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_programs) as programs(program_date date, title text, details text)
    group by programs.program_date
    having count(*) > 1
  ) then
    raise exception 'Each program date may occur only once.' using errcode = '22023';
  end if;

  perform 1
  from public.trips as trips
  where trips.id = p_trip_id
    and trips.archived_at is null
  for update;

  if not found then
    raise exception 'Active trip not found.' using errcode = 'P0002';
  end if;

  select profiles.id into actor_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  return query
  insert into public.trip_daily_programs as daily_programs (
    trip_id,
    program_date,
    title,
    details,
    published_by_profile_id
  )
  select
    p_trip_id,
    programs.program_date,
    nullif(btrim(programs.title), ''),
    btrim(programs.details),
    actor_profile_id
  from jsonb_to_recordset(p_programs) as programs(program_date date, title text, details text)
  on conflict (trip_id, program_date)
  do update set
    title = excluded.title,
    details = excluded.details,
    published_by_profile_id = excluded.published_by_profile_id
  returning daily_programs.*;
end;
$$;

revoke all on function public.admin_upsert_trip_daily_programs(int8, jsonb) from public, anon;
grant execute on function public.admin_upsert_trip_daily_programs(int8, jsonb) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_daily_programs'
  ) then
    alter publication supabase_realtime add table public.trip_daily_programs;
  end if;
end;
$$;

notify pgrst, 'reload schema';
