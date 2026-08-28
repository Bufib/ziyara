alter table public.bus_boardings
add column reminder_interval_minutes int2 not null default 5
  check (reminder_interval_minutes between 1 and 60),
add column urgent_before_minutes int2 not null default 5
  check (urgent_before_minutes between 1 and 60);

create table public.push_notification_devices (
  id int8 generated always as identity primary key,
  profile_id int8 not null references public.profiles (id) on delete cascade,
  expo_push_token text not null unique
    check (
      char_length(expo_push_token) between 24 and 200
      and expo_push_token ~ '^Expo(nent)?PushToken\[[^]]{8,180}\]$'
    ),
  platform text not null check (platform in ('android', 'ios')),
  locale text not null default 'de' check (locale in ('ar', 'de', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, profile_id)
);

create index push_notification_devices_profile_idx
on public.push_notification_devices (profile_id);

create table public.bus_boarding_escalations (
  id int8 generated always as identity primary key,
  trip_id int8 not null,
  boarding_id int8 not null,
  participant_id int8 not null,
  escalated_by_profile_id int8 references public.profiles (id) on delete set null,
  escalated_by_display_name text not null
    check (char_length(btrim(escalated_by_display_name)) between 2 and 80),
  escalated_at timestamptz not null default now(),
  unique (boarding_id, participant_id),
  constraint bus_boarding_escalations_boarding_matches_trip
    foreign key (boarding_id, trip_id)
    references public.bus_boardings (id, trip_id)
    on delete cascade,
  constraint bus_boarding_escalations_participant_matches_trip
    foreign key (participant_id, trip_id)
    references public.trip_participants (id, trip_id)
    on delete cascade
);

create table public.general_alarm_notification_attempts (
  id int8 generated always as identity primary key,
  boarding_id int8 not null references public.bus_boardings (id) on delete cascade,
  participant_id int8 not null references public.trip_participants (id) on delete cascade,
  push_device_id int8 not null references public.push_notification_devices (id) on delete cascade,
  expected_status public.bus_boarding_status not null,
  reminder_slot int4 not null check (reminder_slot >= 0),
  claimed_at timestamptz not null default now(),
  accepted_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) <= 120),
  unique (
    boarding_id,
    participant_id,
    push_device_id,
    expected_status,
    reminder_slot
  )
);

comment on column public.bus_boardings.reminder_interval_minutes is
  'Interval for the next missing general-alarm status. Delivery remains subject to platform notification settings.';
comment on column public.bus_boardings.urgent_before_minutes is
  'Time before departure at which clients present the alarm as urgent.';
comment on table public.push_notification_devices is
  'Private Expo push tokens registered to one profile. Clients never receive token lists.';
comment on table public.bus_boarding_escalations is
  'Latest explicit manual escalation for one physical participant in a boarding round.';
comment on table public.general_alarm_notification_attempts is
  'Private idempotency and Expo-service acceptance log for five-minute general-alarm delivery windows.';

create trigger set_push_notification_devices_updated_at
before update on public.push_notification_devices
for each row execute function public.set_bus_management_updated_at();

alter table public.push_notification_devices enable row level security;
alter table public.bus_boarding_escalations enable row level security;
alter table public.general_alarm_notification_attempts enable row level security;

revoke all on table public.push_notification_devices from anon, authenticated;
revoke all on table public.bus_boarding_escalations from anon, authenticated;
revoke all on table public.general_alarm_notification_attempts from anon, authenticated;

grant select on table public.bus_boarding_escalations to authenticated;

create policy "Admins can read boarding escalations"
on public.bus_boarding_escalations
for select
to authenticated
using ((select public.is_admin()));

create or replace function public.register_push_notification_device(
  p_expo_push_token text,
  p_platform text,
  p_locale text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
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

  insert into public.push_notification_devices (
    profile_id,
    expo_push_token,
    platform,
    locale
  )
  values (
    actor_profile_id,
    btrim(p_expo_push_token),
    lower(btrim(p_platform)),
    lower(btrim(p_locale))
  )
  on conflict (expo_push_token)
  do update set
    profile_id = excluded.profile_id,
    platform = excluded.platform,
    locale = excluded.locale;
end;
$$;

create or replace function public.unregister_push_notification_device(
  p_expo_push_token text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select profiles.id into actor_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  delete from public.push_notification_devices
  where profile_id = actor_profile_id
    and expo_push_token = btrim(p_expo_push_token);
end;
$$;

create or replace function public.admin_escalate_bus_boarding_participant(
  p_boarding_id int8,
  p_participant_id int8
)
returns public.bus_boarding_escalations
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_display_name text;
  actor_profile_id int8;
  boarding_trip_id int8;
  saved_escalation public.bus_boarding_escalations;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select profiles.id, profiles.display_name
  into actor_profile_id, actor_display_name
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

  if exists (
    select 1
    from public.bus_boarding_responses as responses
    where responses.boarding_id = p_boarding_id
      and responses.participant_id = p_participant_id
      and responses.status = 'boarded'::public.bus_boarding_status
  ) then
    raise exception 'Participant is already boarded.' using errcode = '55000';
  end if;

  insert into public.bus_boarding_escalations (
    trip_id,
    boarding_id,
    participant_id,
    escalated_by_profile_id,
    escalated_by_display_name
  )
  values (
    boarding_trip_id,
    p_boarding_id,
    p_participant_id,
    actor_profile_id,
    actor_display_name
  )
  on conflict (boarding_id, participant_id)
  do update set
    escalated_by_profile_id = excluded.escalated_by_profile_id,
    escalated_by_display_name = excluded.escalated_by_display_name,
    escalated_at = now()
  returning * into saved_escalation;

  return saved_escalation;
end;
$$;

create or replace function public.can_dispatch_general_alarm(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profiles
    where profiles.user_id = p_user_id
      and profiles.role = 'admin'::public.app_role
  );
$$;

create or replace function public.claim_due_general_alarm_notifications()
returns table (
  attempt_id int8,
  expo_push_token text,
  locale text,
  platform text,
  boarding_id int8,
  participant_id int8,
  participant_code text,
  expected_status public.bus_boarding_status,
  is_urgent boolean,
  title text,
  departure_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  with due as (
    select
      boardings.id as boarding_id,
      participants.id as participant_id,
      participants.participant_code,
      devices.id as push_device_id,
      devices.expo_push_token,
      devices.locale,
      devices.platform,
      case
        when responses.id is null then 'read'::public.bus_boarding_status
        when responses.status = 'read'::public.bus_boarding_status
          then 'on_way'::public.bus_boarding_status
        else 'boarded'::public.bus_boarding_status
      end as expected_status,
      floor(
        extract(
          epoch from (
            now() - coalesce(responses.updated_at, boardings.opened_at)
          )
        ) / (boardings.reminder_interval_minutes * 60)
      )::int4 as reminder_slot,
      boardings.departure_at <= now()
        + make_interval(mins => boardings.urgent_before_minutes) as is_urgent,
      boardings.title,
      boardings.departure_at
    from public.bus_boardings as boardings
    join public.trip_participants as participants
      on participants.trip_id = boardings.trip_id
    join public.push_notification_devices as devices
      on devices.profile_id = participants.profile_id
    left join public.bus_boarding_responses as responses
      on responses.boarding_id = boardings.id
      and responses.participant_id = participants.id
    where boardings.closed_at is null
      and (
        responses.id is null
        or responses.status in (
          'read'::public.bus_boarding_status,
          'on_way'::public.bus_boarding_status
        )
      )
      and (
        responses.id is null
        or responses.updated_at
          + make_interval(mins => boardings.reminder_interval_minutes) <= now()
      )
  ),
  claimed as (
    insert into public.general_alarm_notification_attempts (
      boarding_id,
      participant_id,
      push_device_id,
      expected_status,
      reminder_slot
    )
    select
      due.boarding_id,
      due.participant_id,
      due.push_device_id,
      due.expected_status,
      due.reminder_slot
    from due
    where due.reminder_slot >= 0
    on conflict do nothing
    returning
      id,
      general_alarm_notification_attempts.boarding_id,
      general_alarm_notification_attempts.participant_id,
      general_alarm_notification_attempts.push_device_id,
      general_alarm_notification_attempts.expected_status,
      general_alarm_notification_attempts.reminder_slot
  )
  select
    claimed.id,
    due.expo_push_token,
    due.locale,
    due.platform,
    due.boarding_id,
    due.participant_id,
    due.participant_code,
    due.expected_status,
    due.is_urgent,
    due.title,
    due.departure_at
  from claimed
  join due
    on due.boarding_id = claimed.boarding_id
    and due.participant_id = claimed.participant_id
    and due.push_device_id = claimed.push_device_id
    and due.expected_status = claimed.expected_status
    and due.reminder_slot = claimed.reminder_slot;
$$;

create or replace function public.complete_general_alarm_notification_attempts(
  p_attempt_ids int8[],
  p_accepted boolean,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.general_alarm_notification_attempts
  set
    accepted_at = case when p_accepted then now() else null end,
    error_code = case
      when p_accepted then null
      else left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 120)
    end
  where id = any(p_attempt_ids);
end;
$$;

revoke all on function public.register_push_notification_device(text, text, text) from public, anon;
revoke all on function public.unregister_push_notification_device(text) from public, anon;
revoke all on function public.admin_escalate_bus_boarding_participant(int8, int8) from public, anon;
revoke all on function public.can_dispatch_general_alarm(uuid) from public, anon, authenticated;
revoke all on function public.claim_due_general_alarm_notifications() from public, anon, authenticated;
revoke all on function public.complete_general_alarm_notification_attempts(int8[], boolean, text) from public, anon, authenticated;

grant execute on function public.register_push_notification_device(text, text, text) to authenticated;
grant execute on function public.unregister_push_notification_device(text) to authenticated;
grant execute on function public.admin_escalate_bus_boarding_participant(int8, int8) to authenticated;
grant execute on function public.can_dispatch_general_alarm(uuid) to service_role;
grant execute on function public.claim_due_general_alarm_notifications() to service_role;
grant execute on function public.complete_general_alarm_notification_attempts(int8[], boolean, text) to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bus_boarding_escalations'
  ) then
    alter publication supabase_realtime
      add table public.bus_boarding_escalations;
  end if;
end;
$$;

notify pgrst, 'reload schema';
