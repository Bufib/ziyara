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
  linked_participant_id int8;
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

  select participants.id into linked_participant_id
  from public.trip_participants as participants
  where participants.id = p_participant_id
    and participants.trip_id = boarding_trip_id
    and participants.profile_id = actor_profile_id
  for update;

  if linked_participant_id is null then
    raise exception 'Participant is not linked to the current user.' using errcode = '42501';
  end if;

  select responses.* into saved_response
  from public.bus_boarding_responses as responses
  where responses.boarding_id = p_boarding_id
    and responses.participant_id = p_participant_id;

  if saved_response.id is not null and saved_response.status = p_status then
    return saved_response;
  end if;

  if
    (saved_response.id is null and p_status not in (
      'read'::public.bus_boarding_status,
      'problem'::public.bus_boarding_status
    ))
    or (saved_response.status = 'read'::public.bus_boarding_status and p_status not in (
      'on_way'::public.bus_boarding_status,
      'problem'::public.bus_boarding_status
    ))
    or (saved_response.status = 'on_way'::public.bus_boarding_status and p_status not in (
      'boarded'::public.bus_boarding_status,
      'problem'::public.bus_boarding_status
    ))
    or saved_response.status in (
      'boarded'::public.bus_boarding_status,
      'problem'::public.bus_boarding_status
    )
  then
    raise exception 'Invalid participant boarding status transition.' using errcode = '22023';
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

revoke all on function public.respond_to_bus_boarding(
  int8,
  int8,
  public.bus_boarding_status
) from public, anon;
grant execute on function public.respond_to_bus_boarding(
  int8,
  int8,
  public.bus_boarding_status
) to authenticated;

notify pgrst, 'reload schema';
