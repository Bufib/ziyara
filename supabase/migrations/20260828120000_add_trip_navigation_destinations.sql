create table public.trip_navigation_destinations (
  id int8 generated always as identity primary key,
  trip_id int8 not null references public.trips (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  details text check (details is null or char_length(btrim(details)) between 1 and 500),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  sort_order int not null default 0 check (sort_order >= 0),
  created_by_profile_id int8 references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index trip_navigation_destinations_active_trip_idx
on public.trip_navigation_destinations (trip_id, sort_order, id)
where archived_at is null;

comment on table public.trip_navigation_destinations is
  'Admin-managed navigation markers shown to members of the active trip.';

create trigger set_trip_navigation_destinations_updated_at
before update on public.trip_navigation_destinations
for each row execute function public.set_trip_guidance_updated_at();

alter table public.trip_navigation_destinations enable row level security;

revoke all on table public.trip_navigation_destinations from anon, authenticated;
grant select on table public.trip_navigation_destinations to authenticated;

create policy "Trip members and admins can read active navigation destinations"
on public.trip_navigation_destinations
for select
to authenticated
using (
  archived_at is null
  and ((select public.is_admin()) or (select public.is_trip_member(trip_id)))
);

create or replace function public.admin_upsert_trip_navigation_destination(
  p_trip_id int8,
  p_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_details text,
  p_destination_id int8 default null
)
returns public.trip_navigation_destinations
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  next_sort_order int;
  saved_destination public.trip_navigation_destinations;
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

  if p_destination_id is null then
    select coalesce(max(destinations.sort_order), -1) + 1
    into next_sort_order
    from public.trip_navigation_destinations as destinations
    where destinations.trip_id = p_trip_id
      and destinations.archived_at is null;

    insert into public.trip_navigation_destinations (
      trip_id,
      name,
      details,
      latitude,
      longitude,
      sort_order,
      created_by_profile_id
    )
    values (
      p_trip_id,
      btrim(p_name),
      nullif(btrim(p_details), ''),
      p_latitude,
      p_longitude,
      next_sort_order,
      actor_profile_id
    )
    returning * into saved_destination;
  else
    perform 1
    from public.trip_navigation_destinations as destinations
    where destinations.id = p_destination_id
      and destinations.trip_id = p_trip_id
      and destinations.archived_at is null
    for update;

    if not found then
      raise exception 'Active navigation destination not found.' using errcode = 'P0002';
    end if;

    update public.trip_navigation_destinations
    set
      name = btrim(p_name),
      details = nullif(btrim(p_details), ''),
      latitude = p_latitude,
      longitude = p_longitude
    where id = p_destination_id
    returning * into saved_destination;
  end if;

  return saved_destination;
end;
$$;

create or replace function public.admin_archive_trip_navigation_destination(
  p_destination_id int8
)
returns public.trip_navigation_destinations
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_destination public.trip_navigation_destinations;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  update public.trip_navigation_destinations as destinations
  set archived_at = now()
  from public.trips as trips
  where destinations.id = p_destination_id
    and destinations.trip_id = trips.id
    and destinations.archived_at is null
    and trips.archived_at is null
  returning destinations.* into saved_destination;

  if saved_destination is null then
    raise exception 'Active navigation destination not found.' using errcode = 'P0002';
  end if;

  return saved_destination;
end;
$$;

revoke all on function public.admin_upsert_trip_navigation_destination(
  int8, text, double precision, double precision, text, int8
) from public, anon;
revoke all on function public.admin_archive_trip_navigation_destination(int8)
from public, anon;

grant execute on function public.admin_upsert_trip_navigation_destination(
  int8, text, double precision, double precision, text, int8
) to authenticated;
grant execute on function public.admin_archive_trip_navigation_destination(int8)
to authenticated;

insert into public.trip_navigation_destinations (
  trip_id,
  name,
  details,
  latitude,
  longitude,
  sort_order,
  created_by_profile_id
)
select
  guidance.trip_id,
  guidance.meeting_point,
  guidance.relevant_gate,
  guidance.meeting_latitude,
  guidance.meeting_longitude,
  0,
  guidance.published_by_profile_id
from public.trip_guidance_updates as guidance
where guidance.closed_at is null
  and guidance.meeting_latitude is not null
  and guidance.meeting_longitude is not null;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'trip_navigation_destinations'
  ) then
    alter publication supabase_realtime add table public.trip_navigation_destinations;
  end if;
end;
$$;

notify pgrst, 'reload schema';
