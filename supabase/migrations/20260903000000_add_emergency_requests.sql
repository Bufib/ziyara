create table public.emergency_requests (
  id int8 generated always as identity primary key,
  requester_profile_id int8 references public.profiles (id) on delete set null,
  requester_display_name text not null
    check (char_length(btrim(requester_display_name)) between 2 and 80),
  target_team text not null check (target_team in ('medical', 'travel')),
  message text not null check (char_length(btrim(message)) between 5 and 1200),
  location_label text
    check (location_label is null or char_length(btrim(location_label)) between 1 and 300),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  accuracy_meters double precision
    check (accuracy_meters is null or accuracy_meters between 0 and 100000),
  created_at timestamptz not null default now(),
  constraint emergency_requests_complete_coordinates check (
    (latitude is null and longitude is null and accuracy_meters is null)
    or (latitude is not null and longitude is not null)
  )
);

create table public.emergency_request_recipients (
  request_id int8 not null references public.emergency_requests (id) on delete cascade,
  recipient_profile_id int8 not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  primary key (request_id, recipient_profile_id)
);

create index emergency_request_recipients_profile_created_idx
on public.emergency_request_recipients (recipient_profile_id, created_at desc);

create index emergency_requests_requester_created_idx
on public.emergency_requests (requester_profile_id, created_at desc);

create table public.emergency_notification_attempts (
  id int8 generated always as identity primary key,
  request_id int8 not null,
  recipient_profile_id int8 not null,
  push_device_id int8 not null references public.push_notification_devices (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  accepted_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) <= 120),
  unique (request_id, push_device_id),
  foreign key (request_id, recipient_profile_id)
    references public.emergency_request_recipients (request_id, recipient_profile_id)
    on delete cascade
);

comment on table public.emergency_requests is
  'Durable user emergency messages for the medical or travel team. Precise coordinates are optional and shared only by explicit action.';
comment on table public.emergency_request_recipients is
  'Materialized recipients who had the selected team role when an emergency message was created.';
comment on table public.emergency_notification_attempts is
  'Private idempotency and Expo-service acceptance log for emergency push notifications.';

alter table public.emergency_requests enable row level security;
alter table public.emergency_request_recipients enable row level security;
alter table public.emergency_notification_attempts enable row level security;

revoke all on table public.emergency_requests from anon, authenticated;
revoke all on table public.emergency_request_recipients from anon, authenticated;
revoke all on table public.emergency_notification_attempts from anon, authenticated;

grant select on table public.emergency_requests to authenticated;
grant select on table public.emergency_request_recipients to authenticated;

create policy "Senders and recipients can read emergency requests"
on public.emergency_requests
for select
to authenticated
using (
  requester_profile_id = (
    select profiles.id
    from public.profiles as profiles
    where profiles.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.emergency_request_recipients as recipients
    where recipients.request_id = emergency_requests.id
      and recipients.recipient_profile_id = (
        select profiles.id
        from public.profiles as profiles
        where profiles.user_id = (select auth.uid())
      )
  )
);

create policy "Recipients can read their emergency receipt"
on public.emergency_request_recipients
for select
to authenticated
using (
  recipient_profile_id = (
    select profiles.id
    from public.profiles as profiles
    where profiles.user_id = (select auth.uid())
  )
);

create or replace function public.submit_emergency_request(
  p_target_team text,
  p_message text,
  p_location_label text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_accuracy_meters double precision default null
)
returns table (request_id int8, recipient_count int4)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_display_name text;
  actor_profile_id int8;
  clean_location_label text;
  clean_message text;
  created_request_id int8;
  target_role public.app_role;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select profiles.id, profiles.display_name
  into actor_profile_id, actor_display_name
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  if actor_profile_id is null then
    raise exception 'A user profile is required.' using errcode = '42501';
  end if;

  clean_message := btrim(coalesce(p_message, ''));
  clean_location_label := nullif(btrim(coalesce(p_location_label, '')), '');

  if char_length(clean_message) not between 5 and 1200 then
    raise exception 'The emergency message must contain between 5 and 1200 characters.'
      using errcode = '22023';
  end if;

  if clean_location_label is not null and char_length(clean_location_label) > 300 then
    raise exception 'The location description must not exceed 300 characters.'
      using errcode = '22023';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must be provided together.' using errcode = '22023';
  end if;

  if p_latitude is null and p_accuracy_meters is not null then
    raise exception 'Location accuracy requires coordinates.' using errcode = '22023';
  end if;

  if p_latitude is not null and not (
    p_latitude between -90 and 90
    and p_longitude between -180 and 180
    and (p_accuracy_meters is null or p_accuracy_meters between 0 and 100000)
  ) then
    raise exception 'The provided coordinates are invalid.' using errcode = '22023';
  end if;

  target_role := case lower(btrim(coalesce(p_target_team, '')))
    when 'medical' then 'medical_staff'::public.app_role
    when 'travel' then 'organization_team'::public.app_role
    else null
  end;

  if target_role is null then
    raise exception 'A valid emergency team is required.' using errcode = '22023';
  end if;

  insert into public.emergency_requests (
    requester_profile_id,
    requester_display_name,
    target_team,
    message,
    location_label,
    latitude,
    longitude,
    accuracy_meters
  )
  values (
    actor_profile_id,
    actor_display_name,
    lower(btrim(p_target_team)),
    clean_message,
    clean_location_label,
    p_latitude,
    p_longitude,
    p_accuracy_meters
  )
  returning id into created_request_id;

  insert into public.emergency_request_recipients (request_id, recipient_profile_id)
  select created_request_id, profiles.id
  from public.profiles as profiles
  where profiles.role = target_role;

  return query
  select created_request_id, count(*)::int4
  from public.emergency_request_recipients as recipients
  where recipients.request_id = created_request_id;
end;
$$;

create or replace function public.list_my_emergency_messages()
returns table (
  request_id int8,
  requester_display_name text,
  target_team text,
  message text,
  location_label text,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  created_at timestamptz,
  read_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    requests.id,
    requests.requester_display_name,
    requests.target_team,
    requests.message,
    requests.location_label,
    requests.latitude,
    requests.longitude,
    requests.accuracy_meters,
    requests.created_at,
    recipients.read_at
  from public.emergency_request_recipients as recipients
  join public.emergency_requests as requests on requests.id = recipients.request_id
  join public.profiles as profiles on profiles.id = recipients.recipient_profile_id
  where profiles.user_id = (select auth.uid())
  order by requests.created_at desc
  limit 100;
$$;

create or replace function public.mark_emergency_request_read(p_request_id int8)
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

  update public.emergency_request_recipients
  set read_at = coalesce(read_at, now())
  where request_id = p_request_id
    and recipient_profile_id = actor_profile_id;

  if not found then
    raise exception 'Emergency message not found.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.claim_emergency_notification_attempts(
  p_request_id int8,
  p_requester_user_id uuid
)
returns table (
  attempt_id int8,
  expo_push_token text,
  locale text,
  request_id int8,
  target_team text
)
language sql
security definer
set search_path = ''
as $$
  with due as (
    select
      requests.id as request_id,
      requests.target_team,
      recipients.recipient_profile_id,
      devices.id as push_device_id,
      devices.expo_push_token,
      devices.locale
    from public.emergency_requests as requests
    join public.profiles as requester
      on requester.id = requests.requester_profile_id
      and requester.user_id = p_requester_user_id
    join public.emergency_request_recipients as recipients
      on recipients.request_id = requests.id
    join public.push_notification_devices as devices
      on devices.profile_id = recipients.recipient_profile_id
    where requests.id = p_request_id
  ),
  claimed as (
    insert into public.emergency_notification_attempts (
      request_id,
      recipient_profile_id,
      push_device_id
    )
    select due.request_id, due.recipient_profile_id, due.push_device_id
    from due
    on conflict do nothing
    returning
      id,
      emergency_notification_attempts.request_id,
      emergency_notification_attempts.push_device_id
  )
  select
    claimed.id,
    due.expo_push_token,
    due.locale,
    due.request_id,
    due.target_team
  from claimed
  join due
    on due.request_id = claimed.request_id
    and due.push_device_id = claimed.push_device_id;
$$;

create or replace function public.complete_emergency_notification_attempt(
  p_attempt_id int8,
  p_accepted boolean,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.emergency_notification_attempts
  set
    accepted_at = case when p_accepted then now() else null end,
    error_code = case
      when p_accepted then null
      else left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 120)
    end
  where id = p_attempt_id;
end;
$$;

revoke all on function public.submit_emergency_request(text, text, text, double precision, double precision, double precision) from public, anon;
revoke all on function public.list_my_emergency_messages() from public, anon;
revoke all on function public.mark_emergency_request_read(int8) from public, anon;
revoke all on function public.claim_emergency_notification_attempts(int8, uuid) from public, anon, authenticated;
revoke all on function public.complete_emergency_notification_attempt(int8, boolean, text) from public, anon, authenticated;

grant execute on function public.submit_emergency_request(text, text, text, double precision, double precision, double precision) to authenticated;
grant execute on function public.list_my_emergency_messages() to authenticated;
grant execute on function public.mark_emergency_request_read(int8) to authenticated;
grant execute on function public.claim_emergency_notification_attempts(int8, uuid) to service_role;
grant execute on function public.complete_emergency_notification_attempt(int8, boolean, text) to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'emergency_requests'
  ) then
    alter publication supabase_realtime add table public.emergency_requests;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'emergency_request_recipients'
  ) then
    alter publication supabase_realtime add table public.emergency_request_recipients;
  end if;
end;
$$;

notify pgrst, 'reload schema';
