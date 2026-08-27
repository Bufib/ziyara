create type public.bus_boarding_status as enum ('on_way', 'boarded', 'problem');

create table public.trips (
  id int8 generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 3 and 120),
  created_by_profile_id int8 references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint trips_archived_after_creation
    check (archived_at is null or archived_at >= created_at)
);

create unique index trips_one_active_idx
on public.trips ((archived_at is null))
where archived_at is null;

create table public.trip_buses (
  id int8 generated always as identity primary key,
  trip_id int8 not null references public.trips (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 60),
  sort_order int4 not null default 0 check (sort_order between 0 and 999),
  created_at timestamptz not null default now(),
  unique (id, trip_id),
  unique (trip_id, name)
);

create table public.trip_participants (
  id int8 generated always as identity primary key,
  trip_id int8 not null references public.trips (id) on delete cascade,
  bus_id int8,
  profile_id int8 references public.profiles (id) on delete set null,
  participant_code text not null
    check (participant_code ~ '^[A-Z0-9][A-Z0-9_-]{1,19}$'),
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trip_id),
  unique (trip_id, participant_code),
  constraint trip_participants_bus_matches_trip
    foreign key (bus_id, trip_id)
    references public.trip_buses (id, trip_id)
    on delete set null (bus_id)
);

create index trip_participants_profile_idx
on public.trip_participants (profile_id, trip_id)
where profile_id is not null;

create index trip_participants_bus_idx
on public.trip_participants (bus_id, participant_code)
where bus_id is not null;

create table public.bus_boardings (
  id int8 generated always as identity primary key,
  trip_id int8 not null references public.trips (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  departure_at timestamptz not null,
  created_by_profile_id int8 references public.profiles (id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (id, trip_id),
  constraint bus_boardings_closed_after_opening
    check (closed_at is null or closed_at >= opened_at)
);

create unique index bus_boardings_one_open_per_trip_idx
on public.bus_boardings (trip_id)
where closed_at is null;

create index bus_boardings_trip_history_idx
on public.bus_boardings (trip_id, opened_at desc);

create table public.bus_boarding_responses (
  id int8 generated always as identity primary key,
  trip_id int8 not null,
  boarding_id int8 not null,
  participant_id int8 not null,
  status public.bus_boarding_status not null,
  updated_by_profile_id int8 references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (boarding_id, participant_id),
  constraint bus_boarding_responses_boarding_matches_trip
    foreign key (boarding_id, trip_id)
    references public.bus_boardings (id, trip_id)
    on delete cascade,
  constraint bus_boarding_responses_participant_matches_trip
    foreign key (participant_id, trip_id)
    references public.trip_participants (id, trip_id)
    on delete cascade
);

comment on table public.trips is
  'Travel groups. At most one trip is active at a time.';
comment on table public.trip_buses is
  'Named buses belonging to one trip.';
comment on table public.trip_participants is
  'Physical participants identified independently from app accounts and optionally linked to one profile.';
comment on table public.bus_boardings is
  'Time-bounded boarding rounds shared by every bus in one trip.';
comment on table public.bus_boarding_responses is
  'Latest status for one physical participant in one boarding round.';

create or replace function public.set_bus_management_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_trip_participants_updated_at
before update on public.trip_participants
for each row execute function public.set_bus_management_updated_at();

create trigger set_bus_boarding_responses_updated_at
before update on public.bus_boarding_responses
for each row execute function public.set_bus_management_updated_at();

create or replace function public.is_trip_member(p_trip_id int8)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_participants as participants
    join public.profiles as profiles on profiles.id = participants.profile_id
    where participants.trip_id = p_trip_id
      and profiles.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_trip_member(int8) from public, anon;
grant execute on function public.is_trip_member(int8) to authenticated;

alter table public.trips enable row level security;
alter table public.trip_buses enable row level security;
alter table public.trip_participants enable row level security;
alter table public.bus_boardings enable row level security;
alter table public.bus_boarding_responses enable row level security;

revoke all on table public.trips from anon, authenticated;
revoke all on table public.trip_buses from anon, authenticated;
revoke all on table public.trip_participants from anon, authenticated;
revoke all on table public.bus_boardings from anon, authenticated;
revoke all on table public.bus_boarding_responses from anon, authenticated;

grant select on table public.trips to authenticated;
grant select on table public.trip_buses to authenticated;
grant select on table public.trip_participants to authenticated;
grant select on table public.bus_boardings to authenticated;
grant select on table public.bus_boarding_responses to authenticated;

create policy "Trip members and admins can read trips"
on public.trips
for select
to authenticated
using ((select public.is_admin()) or (select public.is_trip_member(id)));

create policy "Trip members and admins can read buses"
on public.trip_buses
for select
to authenticated
using ((select public.is_admin()) or (select public.is_trip_member(trip_id)));

create policy "Users can read linked participants and admins can read all"
on public.trip_participants
for select
to authenticated
using (
  (select public.is_admin())
  or profile_id = (
    select profiles.id
    from public.profiles as profiles
    where profiles.user_id = (select auth.uid())
  )
);

create policy "Trip members and admins can read boarding rounds"
on public.bus_boardings
for select
to authenticated
using ((select public.is_admin()) or (select public.is_trip_member(trip_id)));

create policy "Users can read linked boarding responses and admins can read all"
on public.bus_boarding_responses
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.trip_participants as participants
    join public.profiles as profiles on profiles.id = participants.profile_id
    where participants.id = bus_boarding_responses.participant_id
      and profiles.user_id = (select auth.uid())
  )
);

create or replace function public.admin_create_trip(p_name text)
returns public.trips
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  created_trip public.trips;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select profiles.id into actor_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  insert into public.trips (name, created_by_profile_id)
  values (btrim(p_name), actor_profile_id)
  returning * into created_trip;

  return created_trip;
exception
  when unique_violation then
    raise exception 'An active trip already exists.' using errcode = '23505';
end;
$$;

create or replace function public.admin_archive_trip(p_trip_id int8)
returns public.trips
language plpgsql
security definer
set search_path = ''
as $$
declare
  archived_trip public.trips;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  perform 1
  from public.trips as trips
  where trips.id = p_trip_id
    and trips.archived_at is null
  for update;

  if not found then
    raise exception 'Active trip not found.' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.bus_boardings as boardings
    where boardings.trip_id = p_trip_id
      and boardings.closed_at is null
  ) then
    raise exception 'Close the active boarding before archiving the trip.' using errcode = '55000';
  end if;

  update public.trips
  set archived_at = now()
  where id = p_trip_id
  returning * into archived_trip;

  return archived_trip;
end;
$$;

create or replace function public.admin_create_trip_bus(
  p_trip_id int8,
  p_name text
)
returns public.trip_buses
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_bus public.trip_buses;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.trips
    where id = p_trip_id and archived_at is null
  ) then
    raise exception 'Active trip not found.' using errcode = 'P0002';
  end if;

  insert into public.trip_buses (trip_id, name, sort_order)
  values (
    p_trip_id,
    btrim(p_name),
    coalesce((select max(sort_order) + 1 from public.trip_buses where trip_id = p_trip_id), 0)
  )
  returning * into created_bus;

  return created_bus;
end;
$$;

create or replace function public.admin_upsert_trip_participant(
  p_trip_id int8,
  p_participant_code text,
  p_display_name text,
  p_user_id uuid,
  p_bus_id int8
)
returns public.trip_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_profile_id int8;
  normalized_code text;
  saved_participant public.trip_participants;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.trips
    where id = p_trip_id and archived_at is null
  ) then
    raise exception 'Active trip not found.' using errcode = 'P0002';
  end if;

  if p_bus_id is not null and not exists (
    select 1 from public.trip_buses
    where id = p_bus_id and trip_id = p_trip_id
  ) then
    raise exception 'Bus does not belong to the active trip.' using errcode = '23503';
  end if;

  if p_user_id is not null then
    select profiles.id into linked_profile_id
    from public.profiles as profiles
    where profiles.user_id = p_user_id;

    if linked_profile_id is null then
      raise exception 'Profile not found.' using errcode = 'P0002';
    end if;
  end if;

  normalized_code := upper(regexp_replace(btrim(p_participant_code), '\s+', '', 'g'));

  insert into public.trip_participants (
    trip_id,
    bus_id,
    profile_id,
    participant_code,
    display_name
  )
  values (
    p_trip_id,
    p_bus_id,
    linked_profile_id,
    normalized_code,
    btrim(p_display_name)
  )
  on conflict (trip_id, participant_code)
  do update set
    bus_id = excluded.bus_id,
    profile_id = excluded.profile_id,
    display_name = excluded.display_name
  returning * into saved_participant;

  return saved_participant;
end;
$$;

create or replace function public.admin_start_bus_boarding(
  p_trip_id int8,
  p_title text,
  p_departure_at timestamptz
)
returns public.bus_boardings
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  created_boarding public.bus_boardings;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  perform 1
  from public.trips as trips
  where trips.id = p_trip_id
    and trips.archived_at is null
  for share;

  if not found then
    raise exception 'Active trip not found.' using errcode = 'P0002';
  end if;

  if p_departure_at < now() - interval '5 minutes' then
    raise exception 'Departure time is in the past.' using errcode = '22007';
  end if;

  select profiles.id into actor_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  insert into public.bus_boardings (
    trip_id,
    title,
    departure_at,
    created_by_profile_id
  )
  values (p_trip_id, btrim(p_title), p_departure_at, actor_profile_id)
  returning * into created_boarding;

  return created_boarding;
exception
  when unique_violation then
    raise exception 'An active boarding already exists.' using errcode = '23505';
end;
$$;

create or replace function public.admin_close_bus_boarding(p_boarding_id int8)
returns public.bus_boardings
language plpgsql
security definer
set search_path = ''
as $$
declare
  closed_boarding public.bus_boardings;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  perform 1
  from public.bus_boardings as boardings
  where boardings.id = p_boarding_id
    and boardings.closed_at is null
  for update;

  if not found then
    raise exception 'Active boarding not found.' using errcode = 'P0002';
  end if;

  update public.bus_boardings
  set closed_at = now()
  where id = p_boarding_id
  returning * into closed_boarding;

  return closed_boarding;
end;
$$;

create or replace function public.respond_to_bus_boarding(
  p_boarding_id int8,
  p_participant_id int8,
  p_status public.bus_boarding_status
)
returns public.bus_boarding_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  boarding_trip_id int8;
  saved_response public.bus_boarding_responses;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select profiles.id into actor_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  if actor_profile_id is null then
    raise exception 'A user profile is required.' using errcode = '42501';
  end if;

  select boardings.trip_id into boarding_trip_id
  from public.bus_boardings as boardings
  where boardings.id = p_boarding_id
    and boardings.closed_at is null
  for share;

  if boarding_trip_id is null then
    raise exception 'Active boarding not found.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.trip_participants as participants
    where participants.id = p_participant_id
      and participants.trip_id = boarding_trip_id
      and participants.profile_id = actor_profile_id
  ) then
    raise exception 'Participant is not linked to the current user.' using errcode = '42501';
  end if;

  insert into public.bus_boarding_responses (
    trip_id,
    boarding_id,
    participant_id,
    status,
    updated_by_profile_id
  )
  values (
    boarding_trip_id,
    p_boarding_id,
    p_participant_id,
    p_status,
    actor_profile_id
  )
  on conflict (boarding_id, participant_id)
  do update set
    status = excluded.status,
    updated_by_profile_id = excluded.updated_by_profile_id
  returning * into saved_response;

  return saved_response;
end;
$$;

create or replace function public.admin_set_bus_boarding_status(
  p_boarding_id int8,
  p_participant_id int8,
  p_status public.bus_boarding_status
)
returns public.bus_boarding_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  boarding_trip_id int8;
  saved_response public.bus_boarding_responses;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select profiles.id into actor_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  select boardings.trip_id into boarding_trip_id
  from public.bus_boardings as boardings
  where boardings.id = p_boarding_id
    and boardings.closed_at is null
  for share;

  if boarding_trip_id is null then
    raise exception 'Active boarding not found.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.trip_participants as participants
    where participants.id = p_participant_id
      and participants.trip_id = boarding_trip_id
  ) then
    raise exception 'Participant does not belong to the boarding trip.' using errcode = '23503';
  end if;

  insert into public.bus_boarding_responses (
    trip_id,
    boarding_id,
    participant_id,
    status,
    updated_by_profile_id
  )
  values (
    boarding_trip_id,
    p_boarding_id,
    p_participant_id,
    p_status,
    actor_profile_id
  )
  on conflict (boarding_id, participant_id)
  do update set
    status = excluded.status,
    updated_by_profile_id = excluded.updated_by_profile_id
  returning * into saved_response;

  return saved_response;
end;
$$;

revoke all on function public.admin_create_trip(text) from public, anon;
revoke all on function public.admin_archive_trip(int8) from public, anon;
revoke all on function public.admin_create_trip_bus(int8, text) from public, anon;
revoke all on function public.admin_upsert_trip_participant(int8, text, text, uuid, int8) from public, anon;
revoke all on function public.admin_start_bus_boarding(int8, text, timestamptz) from public, anon;
revoke all on function public.admin_close_bus_boarding(int8) from public, anon;
revoke all on function public.respond_to_bus_boarding(int8, int8, public.bus_boarding_status) from public, anon;
revoke all on function public.admin_set_bus_boarding_status(int8, int8, public.bus_boarding_status) from public, anon;

grant execute on function public.admin_create_trip(text) to authenticated;
grant execute on function public.admin_archive_trip(int8) to authenticated;
grant execute on function public.admin_create_trip_bus(int8, text) to authenticated;
grant execute on function public.admin_upsert_trip_participant(int8, text, text, uuid, int8) to authenticated;
grant execute on function public.admin_start_bus_boarding(int8, text, timestamptz) to authenticated;
grant execute on function public.admin_close_bus_boarding(int8) to authenticated;
grant execute on function public.respond_to_bus_boarding(int8, int8, public.bus_boarding_status) to authenticated;
grant execute on function public.admin_set_bus_boarding_status(int8, int8, public.bus_boarding_status) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'trips',
    'trip_buses',
    'trip_participants',
    'bus_boardings',
    'bus_boarding_responses'
  ] loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
