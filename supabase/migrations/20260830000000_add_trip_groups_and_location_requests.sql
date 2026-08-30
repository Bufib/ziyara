create type public.trip_group_location_status as enum ('pending', 'shared', 'declined');

create table public.trip_groups (
  id int8 generated always as identity primary key,
  trip_id int8 not null references public.trips (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  leader_participant_id int8 not null,
  created_by_profile_id int8 references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, trip_id),
  unique (trip_id, name),
  constraint trip_groups_leader_matches_trip
    foreign key (leader_participant_id, trip_id)
    references public.trip_participants (id, trip_id)
    on delete restrict
);

create table public.trip_group_members (
  group_id int8 not null,
  trip_id int8 not null,
  participant_id int8 not null,
  created_at timestamptz not null default now(),
  primary key (group_id, participant_id),
  unique (participant_id),
  constraint trip_group_members_group_matches_trip
    foreign key (group_id, trip_id)
    references public.trip_groups (id, trip_id)
    on delete cascade,
  constraint trip_group_members_participant_matches_trip
    foreign key (participant_id, trip_id)
    references public.trip_participants (id, trip_id)
    on delete cascade
);

create table public.trip_group_location_requests (
  id int8 generated always as identity primary key,
  group_id int8 not null unique,
  trip_id int8 not null,
  status public.trip_group_location_status not null default 'pending',
  requested_by_profile_id int8 references public.profiles (id) on delete set null,
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  accuracy_meters double precision check (
    accuracy_meters is null or accuracy_meters between 0 and 100000
  ),
  location_expires_at timestamptz,
  constraint trip_group_location_requests_group_matches_trip
    foreign key (group_id, trip_id)
    references public.trip_groups (id, trip_id)
    on delete cascade,
  constraint trip_group_location_request_state_valid check (
    (
      status = 'pending'
      and responded_at is null
      and latitude is null
      and longitude is null
      and accuracy_meters is null
      and location_expires_at is null
    )
    or (
      status = 'shared'
      and responded_at is not null
      and latitude is not null
      and longitude is not null
      and location_expires_at is not null
    )
    or (
      status = 'declined'
      and responded_at is not null
      and latitude is null
      and longitude is null
      and accuracy_meters is null
      and location_expires_at is not null
    )
  )
);

create index trip_group_members_group_idx
on public.trip_group_members (group_id, participant_id);

create index trip_group_location_requests_visibility_idx
on public.trip_group_location_requests (trip_id, status, location_expires_at);

comment on table public.trip_groups is
  'Admin-created subgroups of physical participants for one active trip.';
comment on table public.trip_group_members is
  'Physical participants assigned to exactly one trip subgroup.';
comment on table public.trip_group_location_requests is
  'One current, consent-based, one-shot leader location request per subgroup. Shared coordinates are client-readable only for a short period.';

create trigger set_trip_groups_updated_at
before update on public.trip_groups
for each row execute function public.set_bus_management_updated_at();

create or replace function public.is_trip_group_member(p_group_id int8)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_groups as groups
    join public.trips as trips on trips.id = groups.trip_id
    join public.trip_group_members as members on members.group_id = groups.id
    join public.trip_participants as participants on participants.id = members.participant_id
    join public.profiles as profiles on profiles.id = participants.profile_id
    where groups.id = p_group_id
      and trips.archived_at is null
      and profiles.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_trip_group_leader(p_group_id int8)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_groups as groups
    join public.trips as trips on trips.id = groups.trip_id
    join public.trip_participants as participants
      on participants.id = groups.leader_participant_id
    join public.profiles as profiles on profiles.id = participants.profile_id
    where groups.id = p_group_id
      and trips.archived_at is null
      and profiles.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_trip_group_member(int8) from public, anon;
revoke all on function public.is_trip_group_leader(int8) from public, anon;
grant execute on function public.is_trip_group_member(int8) to authenticated;
grant execute on function public.is_trip_group_leader(int8) to authenticated;

alter table public.trip_groups enable row level security;
alter table public.trip_group_members enable row level security;
alter table public.trip_group_location_requests enable row level security;

revoke all on table public.trip_groups from anon, authenticated;
revoke all on table public.trip_group_members from anon, authenticated;
revoke all on table public.trip_group_location_requests from anon, authenticated;

grant select on table public.trip_groups to authenticated;
grant select on table public.trip_group_members to authenticated;
grant select on table public.trip_group_location_requests to authenticated;

create policy "Members and admins can read trip groups"
on public.trip_groups
for select
to authenticated
using ((select public.is_admin()) or (select public.is_trip_group_member(id)));

create policy "Members and admins can read trip group membership"
on public.trip_group_members
for select
to authenticated
using (
  (select public.is_admin())
  or (select public.is_trip_group_member(group_id))
);

create policy "Leaders and admins can read current group location requests"
on public.trip_group_location_requests
for select
to authenticated
using (
  (
    status = 'pending'
    or location_expires_at > now()
  )
  and (
    (select public.is_admin())
    or (select public.is_trip_group_leader(group_id))
  )
);

create or replace function public.get_trip_group_member_summaries()
returns table (
  group_id int8,
  trip_id int8,
  participant_id int8,
  participant_code text,
  display_name text,
  is_leader boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    groups.id,
    groups.trip_id,
    participants.id,
    participants.participant_code,
    participants.display_name,
    participants.id = groups.leader_participant_id
  from public.trip_groups as groups
  join public.trips as trips on trips.id = groups.trip_id
  join public.trip_group_members as members on members.group_id = groups.id
  join public.trip_participants as participants on participants.id = members.participant_id
  where (select auth.uid()) is not null
    and trips.archived_at is null
    and (
      (select public.is_admin())
      or (select public.is_trip_group_member(groups.id))
    )
  order by groups.id, participants.participant_code;
$$;

revoke all on function public.get_trip_group_member_summaries() from public, anon;
grant execute on function public.get_trip_group_member_summaries() to authenticated;

create or replace function public.admin_upsert_trip_group(
  p_trip_id int8,
  p_name text,
  p_leader_participant_id int8,
  p_member_participant_ids int8[],
  p_group_id int8 default null
)
returns public.trip_groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  member_count int;
  saved_group public.trip_groups;
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

  member_count := cardinality(p_member_participant_ids);
  if p_member_participant_ids is null or member_count < 1 or member_count > 100 then
    raise exception 'Between one and one hundred group members are required.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_member_participant_ids) as member_ids(participant_id)
    where member_ids.participant_id is null
  ) or (
    select count(distinct member_ids.participant_id)
    from unnest(p_member_participant_ids) as member_ids(participant_id)
  ) <> member_count then
    raise exception 'Group member IDs must be unique and non-null.' using errcode = '22023';
  end if;

  if not (p_leader_participant_id = any(p_member_participant_ids)) then
    raise exception 'The group leader must also be a group member.' using errcode = '22023';
  end if;

  if (
    select count(*)
    from public.trip_participants as participants
    where participants.trip_id = p_trip_id
      and participants.id = any(p_member_participant_ids)
  ) <> member_count then
    raise exception 'Every group member must belong to the active trip.' using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.trip_participants as participants
    where participants.id = p_leader_participant_id
      and participants.trip_id = p_trip_id
      and participants.profile_id is not null
  ) then
    raise exception 'The group leader must have a linked app account.' using errcode = '23503';
  end if;

  if exists (
    select 1
    from public.trip_group_members as members
    where members.participant_id = any(p_member_participant_ids)
      and (p_group_id is null or members.group_id <> p_group_id)
  ) then
    raise exception 'A participant can belong to only one trip group.' using errcode = '23505';
  end if;

  select profiles.id into actor_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  if p_group_id is null then
    insert into public.trip_groups (
      trip_id,
      name,
      leader_participant_id,
      created_by_profile_id
    )
    values (
      p_trip_id,
      btrim(p_name),
      p_leader_participant_id,
      actor_profile_id
    )
    returning * into saved_group;
  else
    perform 1
    from public.trip_groups as groups
    where groups.id = p_group_id
      and groups.trip_id = p_trip_id
    for update;

    if not found then
      raise exception 'Trip group not found.' using errcode = 'P0002';
    end if;

    delete from public.trip_group_location_requests
    where group_id = p_group_id;

    delete from public.trip_group_members
    where group_id = p_group_id;

    update public.trip_groups
    set
      name = btrim(p_name),
      leader_participant_id = p_leader_participant_id
    where id = p_group_id
    returning * into saved_group;
  end if;

  insert into public.trip_group_members (group_id, trip_id, participant_id)
  select saved_group.id, p_trip_id, member_ids.participant_id
  from unnest(p_member_participant_ids) as member_ids(participant_id);

  return saved_group;
exception
  when unique_violation then
    raise exception 'Group names and participant assignments must be unique.'
      using errcode = '23505';
end;
$$;

create or replace function public.admin_delete_trip_group(p_group_id int8)
returns public.trip_groups
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_group public.trip_groups;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  delete from public.trip_groups as groups
  using public.trips as trips
  where groups.id = p_group_id
    and groups.trip_id = trips.id
    and trips.archived_at is null
  returning groups.* into deleted_group;

  if deleted_group is null then
    raise exception 'Trip group not found.' using errcode = 'P0002';
  end if;

  return deleted_group;
end;
$$;

create or replace function public.admin_request_trip_group_location(p_group_id int8)
returns public.trip_group_location_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  group_trip_id int8;
  saved_request public.trip_group_location_requests;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select groups.trip_id into group_trip_id
  from public.trip_groups as groups
  join public.trips as trips on trips.id = groups.trip_id
  join public.trip_participants as leaders
    on leaders.id = groups.leader_participant_id
  where groups.id = p_group_id
    and trips.archived_at is null
    and leaders.profile_id is not null
  for update of groups;

  if group_trip_id is null then
    raise exception 'Trip group with a linked leader not found.' using errcode = 'P0002';
  end if;

  select profiles.id into actor_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  insert into public.trip_group_location_requests as requests (
    group_id,
    trip_id,
    status,
    requested_by_profile_id,
    requested_at
  )
  values (
    p_group_id,
    group_trip_id,
    'pending',
    actor_profile_id,
    now()
  )
  on conflict (group_id)
  do update set
    status = 'pending',
    requested_by_profile_id = excluded.requested_by_profile_id,
    requested_at = excluded.requested_at,
    responded_at = null,
    latitude = null,
    longitude = null,
    accuracy_meters = null,
    location_expires_at = null
  returning requests.* into saved_request;

  return saved_request;
end;
$$;

create or replace function public.respond_to_trip_group_location(
  p_request_id int8,
  p_share boolean,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null
)
returns public.trip_group_location_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  saved_request public.trip_group_location_requests;
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

  perform 1
  from public.trip_group_location_requests as requests
  join public.trip_groups as groups on groups.id = requests.group_id
  join public.trips as trips on trips.id = requests.trip_id
  join public.trip_participants as leaders
    on leaders.id = groups.leader_participant_id
  where requests.id = p_request_id
    and requests.status = 'pending'
    and trips.archived_at is null
    and leaders.profile_id = actor_profile_id
  for update of requests;

  if not found then
    raise exception 'Pending location request for the current group leader not found.'
      using errcode = 'P0002';
  end if;

  if p_share and (
    p_latitude is null
    or p_longitude is null
    or p_latitude not between -90 and 90
    or p_longitude not between -180 and 180
    or (p_accuracy_meters is not null and p_accuracy_meters not between 0 and 100000)
  ) then
    raise exception 'Valid coordinates are required to share a location.' using errcode = '22023';
  end if;

  update public.trip_group_location_requests
  set
    status = case
      when p_share then 'shared'::public.trip_group_location_status
      else 'declined'::public.trip_group_location_status
    end,
    responded_at = now(),
    latitude = case when p_share then p_latitude else null end,
    longitude = case when p_share then p_longitude else null end,
    accuracy_meters = case when p_share then p_accuracy_meters else null end,
    location_expires_at = now() + interval '15 minutes'
  where id = p_request_id
  returning * into saved_request;

  return saved_request;
end;
$$;

revoke all on function public.admin_upsert_trip_group(int8, text, int8, int8[], int8)
from public, anon;
revoke all on function public.admin_delete_trip_group(int8) from public, anon;
revoke all on function public.admin_request_trip_group_location(int8) from public, anon;
revoke all on function public.respond_to_trip_group_location(
  int8, boolean, double precision, double precision, double precision
) from public, anon;

grant execute on function public.admin_upsert_trip_group(int8, text, int8, int8[], int8)
to authenticated;
grant execute on function public.admin_delete_trip_group(int8) to authenticated;
grant execute on function public.admin_request_trip_group_location(int8) to authenticated;
grant execute on function public.respond_to_trip_group_location(
  int8, boolean, double precision, double precision, double precision
) to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'trip_groups',
    'trip_group_members',
    'trip_group_location_requests'
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
