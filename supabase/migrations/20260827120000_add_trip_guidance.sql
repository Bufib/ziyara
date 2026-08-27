create type public.trip_guidance_status as enum (
  'on_way',
  'almost_there',
  'at_meeting_point',
  'problem',
  'lost',
  'medical_help'
);

create table public.trip_guidance_updates (
  id int8 generated always as identity primary key,
  trip_id int8 not null references public.trips (id) on delete cascade,
  current_place_name text not null
    check (char_length(btrim(current_place_name)) between 2 and 120),
  current_place_slug text
    check (current_place_slug is null or current_place_slug ~ '^[a-z0-9][a-z0-9-]{1,99}$'),
  current_latitude double precision
    check (current_latitude is null or current_latitude between -90 and 90),
  current_longitude double precision
    check (current_longitude is null or current_longitude between -180 and 180),
  next_program_name text not null
    check (char_length(btrim(next_program_name)) between 2 and 120),
  departure_at timestamptz not null,
  meeting_point text not null
    check (char_length(btrim(meeting_point)) between 2 and 160),
  meeting_latitude double precision
    check (meeting_latitude is null or meeting_latitude between -90 and 90),
  meeting_longitude double precision
    check (meeting_longitude is null or meeting_longitude between -180 and 180),
  relevant_gate text check (
    relevant_gate is null or char_length(btrim(relevant_gate)) between 1 and 80
  ),
  distance_hint text check (
    distance_hint is null or char_length(btrim(distance_hint)) between 1 and 80
  ),
  description text check (
    description is null or char_length(btrim(description)) between 1 and 1000
  ),
  acts text check (acts is null or char_length(btrim(acts)) between 1 and 1000),
  published_by_profile_id int8 references public.profiles (id) on delete set null,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (id, trip_id),
  constraint trip_guidance_current_coordinates_complete check (
    (current_latitude is null) = (current_longitude is null)
  ),
  constraint trip_guidance_meeting_coordinates_complete check (
    (meeting_latitude is null) = (meeting_longitude is null)
  ),
  constraint trip_guidance_closed_after_publication check (
    closed_at is null or closed_at >= published_at
  )
);

create unique index trip_guidance_one_open_per_trip_idx
on public.trip_guidance_updates (trip_id)
where closed_at is null;

create index trip_guidance_history_idx
on public.trip_guidance_updates (trip_id, published_at desc);

create table public.trip_guidance_responses (
  id int8 generated always as identity primary key,
  trip_id int8 not null,
  guidance_id int8 not null,
  participant_id int8 not null,
  status public.trip_guidance_status not null,
  acknowledged_by_profile_id int8 references public.profiles (id) on delete set null,
  acknowledged_by_display_name text check (
    acknowledged_by_display_name is null
    or char_length(btrim(acknowledged_by_display_name)) between 2 and 80
  ),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guidance_id, participant_id),
  constraint trip_guidance_responses_guidance_matches_trip
    foreign key (guidance_id, trip_id)
    references public.trip_guidance_updates (id, trip_id)
    on delete cascade,
  constraint trip_guidance_responses_participant_matches_trip
    foreign key (participant_id, trip_id)
    references public.trip_participants (id, trip_id)
    on delete cascade,
  constraint trip_guidance_acknowledgement_complete check (
    (acknowledged_by_display_name is null and acknowledged_at is null)
    or (acknowledged_by_display_name is not null and acknowledged_at is not null)
  ),
  constraint only_problem_status_can_be_acknowledged check (
    acknowledged_at is null or status = 'problem'
  )
);

create index trip_guidance_responses_status_idx
on public.trip_guidance_responses (guidance_id, status, updated_at desc);

comment on table public.trip_guidance_updates is
  'The currently published itinerary point for a trip and its retained history.';
comment on table public.trip_guidance_responses is
  'Latest meeting-point status for one physical participant at one itinerary point.';
comment on column public.trip_guidance_responses.acknowledged_by_display_name is
  'Leader name captured when a problem is explicitly acknowledged, so the reporting participant can see who took the case.';

create or replace function public.set_trip_guidance_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_trip_guidance_updates_updated_at
before update on public.trip_guidance_updates
for each row execute function public.set_trip_guidance_updated_at();

create trigger set_trip_guidance_responses_updated_at
before update on public.trip_guidance_responses
for each row execute function public.set_trip_guidance_updated_at();

alter table public.trip_guidance_updates enable row level security;
alter table public.trip_guidance_responses enable row level security;

revoke all on table public.trip_guidance_updates from anon, authenticated;
revoke all on table public.trip_guidance_responses from anon, authenticated;

grant select on table public.trip_guidance_updates to authenticated;
grant select on table public.trip_guidance_responses to authenticated;

create policy "Trip members and admins can read guidance"
on public.trip_guidance_updates
for select
to authenticated
using ((select public.is_admin()) or (select public.is_trip_member(trip_id)));

create policy "Users can read own guidance responses and admins can read all"
on public.trip_guidance_responses
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.trip_participants as participants
    join public.profiles as profiles on profiles.id = participants.profile_id
    where participants.id = trip_guidance_responses.participant_id
      and profiles.user_id = (select auth.uid())
  )
);

create or replace function public.admin_publish_trip_guidance(
  p_trip_id int8,
  p_current_place_name text,
  p_current_place_slug text,
  p_current_latitude double precision,
  p_current_longitude double precision,
  p_next_program_name text,
  p_departure_at timestamptz,
  p_meeting_point text,
  p_meeting_latitude double precision,
  p_meeting_longitude double precision,
  p_relevant_gate text,
  p_distance_hint text,
  p_description text,
  p_acts text
)
returns public.trip_guidance_updates
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  created_guidance public.trip_guidance_updates;
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

  select profiles.id into actor_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  update public.trip_guidance_updates
  set closed_at = now()
  where trip_id = p_trip_id
    and closed_at is null;

  insert into public.trip_guidance_updates (
    trip_id,
    current_place_name,
    current_place_slug,
    current_latitude,
    current_longitude,
    next_program_name,
    departure_at,
    meeting_point,
    meeting_latitude,
    meeting_longitude,
    relevant_gate,
    distance_hint,
    description,
    acts,
    published_by_profile_id
  )
  values (
    p_trip_id,
    btrim(p_current_place_name),
    nullif(btrim(p_current_place_slug), ''),
    p_current_latitude,
    p_current_longitude,
    btrim(p_next_program_name),
    p_departure_at,
    btrim(p_meeting_point),
    p_meeting_latitude,
    p_meeting_longitude,
    nullif(btrim(p_relevant_gate), ''),
    nullif(btrim(p_distance_hint), ''),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_acts), ''),
    actor_profile_id
  )
  returning * into created_guidance;

  return created_guidance;
end;
$$;

create or replace function public.admin_update_trip_guidance(
  p_guidance_id int8,
  p_current_place_name text,
  p_current_place_slug text,
  p_current_latitude double precision,
  p_current_longitude double precision,
  p_next_program_name text,
  p_departure_at timestamptz,
  p_meeting_point text,
  p_meeting_latitude double precision,
  p_meeting_longitude double precision,
  p_relevant_gate text,
  p_distance_hint text,
  p_description text,
  p_acts text
)
returns public.trip_guidance_updates
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_guidance public.trip_guidance_updates;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  perform 1
  from public.trip_guidance_updates as guidance
  join public.trips as trips on trips.id = guidance.trip_id
  where guidance.id = p_guidance_id
    and guidance.closed_at is null
    and trips.archived_at is null
  for update of guidance;

  if not found then
    raise exception 'Active guidance not found.' using errcode = 'P0002';
  end if;

  update public.trip_guidance_updates
  set
    current_place_name = btrim(p_current_place_name),
    current_place_slug = nullif(btrim(p_current_place_slug), ''),
    current_latitude = p_current_latitude,
    current_longitude = p_current_longitude,
    next_program_name = btrim(p_next_program_name),
    departure_at = p_departure_at,
    meeting_point = btrim(p_meeting_point),
    meeting_latitude = p_meeting_latitude,
    meeting_longitude = p_meeting_longitude,
    relevant_gate = nullif(btrim(p_relevant_gate), ''),
    distance_hint = nullif(btrim(p_distance_hint), ''),
    description = nullif(btrim(p_description), ''),
    acts = nullif(btrim(p_acts), '')
  where id = p_guidance_id
  returning * into saved_guidance;

  return saved_guidance;
end;
$$;

create or replace function public.respond_to_trip_guidance(
  p_guidance_id int8,
  p_participant_id int8,
  p_status public.trip_guidance_status
)
returns public.trip_guidance_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  guidance_trip_id int8;
  saved_response public.trip_guidance_responses;
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

  select guidance.trip_id into guidance_trip_id
  from public.trip_guidance_updates as guidance
  where guidance.id = p_guidance_id
    and guidance.closed_at is null
  for share;

  if guidance_trip_id is null then
    raise exception 'Active guidance not found.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.trip_participants as participants
    where participants.id = p_participant_id
      and participants.trip_id = guidance_trip_id
      and participants.profile_id = actor_profile_id
  ) then
    raise exception 'Participant is not linked to the current user.' using errcode = '42501';
  end if;

  insert into public.trip_guidance_responses (
    trip_id,
    guidance_id,
    participant_id,
    status
  )
  values (
    guidance_trip_id,
    p_guidance_id,
    p_participant_id,
    p_status
  )
  on conflict (guidance_id, participant_id)
  do update set
    status = excluded.status,
    acknowledged_by_profile_id = null,
    acknowledged_by_display_name = null,
    acknowledged_at = null
  returning * into saved_response;

  return saved_response;
end;
$$;

create or replace function public.admin_acknowledge_trip_guidance_problem(p_response_id int8)
returns public.trip_guidance_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  actor_display_name text;
  saved_response public.trip_guidance_responses;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select profiles.id, profiles.display_name
  into actor_profile_id, actor_display_name
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  perform 1
  from public.trip_guidance_responses as responses
  join public.trip_guidance_updates as guidance on guidance.id = responses.guidance_id
  where responses.id = p_response_id
    and responses.status = 'problem'
    and guidance.closed_at is null
  for update of responses;

  if not found then
    raise exception 'Active problem report not found.' using errcode = 'P0002';
  end if;

  update public.trip_guidance_responses
  set
    acknowledged_by_profile_id = actor_profile_id,
    acknowledged_by_display_name = actor_display_name,
    acknowledged_at = now()
  where id = p_response_id
  returning * into saved_response;

  return saved_response;
end;
$$;

revoke all on function public.admin_publish_trip_guidance(
  int8, text, text, double precision, double precision, text, timestamptz, text,
  double precision, double precision, text, text, text, text
) from public, anon;
revoke all on function public.admin_update_trip_guidance(
  int8, text, text, double precision, double precision, text, timestamptz, text,
  double precision, double precision, text, text, text, text
) from public, anon;
revoke all on function public.respond_to_trip_guidance(
  int8, int8, public.trip_guidance_status
) from public, anon;
revoke all on function public.admin_acknowledge_trip_guidance_problem(int8) from public, anon;

grant execute on function public.admin_publish_trip_guidance(
  int8, text, text, double precision, double precision, text, timestamptz, text,
  double precision, double precision, text, text, text, text
) to authenticated;
grant execute on function public.admin_update_trip_guidance(
  int8, text, text, double precision, double precision, text, timestamptz, text,
  double precision, double precision, text, text, text, text
) to authenticated;
grant execute on function public.respond_to_trip_guidance(
  int8, int8, public.trip_guidance_status
) to authenticated;
grant execute on function public.admin_acknowledge_trip_guidance_problem(int8) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'trip_guidance_updates',
    'trip_guidance_responses'
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
