create table public.emergency_team_duties (
  profile_id int8 primary key references public.profiles (id) on delete cascade,
  team text not null check (team in ('medical', 'travel')),
  assigned_by_profile_id int8 references public.profiles (id) on delete set null,
  assigned_by_display_name text not null
    check (char_length(btrim(assigned_by_display_name)) between 2 and 80),
  assigned_at timestamptz not null default now()
);

create table public.emergency_duty_notifications (
  id int8 generated always as identity primary key,
  recipient_profile_id int8 not null references public.profiles (id) on delete cascade,
  team text not null check (team in ('medical', 'travel')),
  assigned_by_profile_id int8 references public.profiles (id) on delete set null,
  assigned_by_display_name text not null
    check (char_length(btrim(assigned_by_display_name)) between 2 and 80),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index emergency_duty_notifications_recipient_created_idx
on public.emergency_duty_notifications (recipient_profile_id, created_at desc);

create table public.emergency_duty_notification_attempts (
  id int8 generated always as identity primary key,
  notification_id int8 not null
    references public.emergency_duty_notifications (id) on delete cascade,
  push_device_id int8 not null
    references public.push_notification_devices (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  accepted_at timestamptz,
  error_code text check (error_code is null or char_length(error_code) <= 120),
  unique (notification_id, push_device_id)
);

comment on table public.emergency_team_duties is
  'Admin-managed current emergency duty assignments for medical and organization team members.';
comment on table public.emergency_duty_notifications is
  'Durable inbox notifications created when an administrator assigns emergency duty.';
comment on table public.emergency_duty_notification_attempts is
  'Private idempotency and Expo-service acceptance log for emergency-duty push notifications.';

alter table public.emergency_team_duties enable row level security;
alter table public.emergency_duty_notifications enable row level security;
alter table public.emergency_duty_notification_attempts enable row level security;

revoke all on table public.emergency_team_duties from anon, authenticated;
revoke all on table public.emergency_duty_notifications from anon, authenticated;
revoke all on table public.emergency_duty_notification_attempts from anon, authenticated;

grant select on table public.emergency_team_duties to authenticated;
grant select on table public.emergency_duty_notifications to authenticated;

create policy "Team members can read their own emergency duty"
on public.emergency_team_duties
for select
to authenticated
using (
  profile_id = (
    select profiles.id
    from public.profiles as profiles
    where profiles.user_id = (select auth.uid())
  )
);

create policy "Recipients can read their emergency duty notifications"
on public.emergency_duty_notifications
for select
to authenticated
using (
  recipient_profile_id = (
    select profiles.id
    from public.profiles as profiles
    where profiles.user_id = (select auth.uid())
  )
);

create policy "Authorized teams can read their emergency dashboard"
on public.emergency_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles as actor
    where actor.user_id = (select auth.uid())
      and (
        actor.role = 'admin'::public.app_role
        or (
          actor.role = 'medical_staff'::public.app_role
          and emergency_requests.target_team = 'medical'
        )
        or (
          actor.role = 'organization_team'::public.app_role
          and emergency_requests.target_team = 'travel'
        )
      )
  )
);

create or replace function public.clear_emergency_duty_after_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role is distinct from new.role then
    delete from public.emergency_team_duties where profile_id = new.id;
  end if;
  return new;
end;
$$;

create trigger clear_emergency_duty_after_role_change
after update of role on public.profiles
for each row execute function public.clear_emergency_duty_after_role_change();

drop function public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  display_name text,
  member_type public.member_type,
  party_size int8,
  luggage_count int8,
  sim_card_count int8,
  role public.app_role,
  family_id int8,
  family_name text,
  emergency_on_duty boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  return query
  select
    profiles.user_id,
    profiles.display_name,
    profiles.member_type,
    profiles.party_size,
    profiles.luggage_count,
    profiles.sim_card_count,
    profiles.role,
    families.id,
    families.name,
    duties.profile_id is not null
  from public.profiles as profiles
  left join public.account_families as families on families.id = profiles.family_id
  left join public.emergency_team_duties as duties on duties.profile_id = profiles.id
  order by families.name nulls last, profiles.display_name, profiles.user_id;
end;
$$;

comment on function public.admin_list_users() is
  'Returns the minimal account data required for account, role, family, and emergency-duty administration.';

create or replace function public.admin_set_emergency_duty(
  p_user_id uuid,
  p_on_duty boolean
)
returns table (
  profile_id int8,
  emergency_on_duty boolean,
  notification_id int8
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_display_name text;
  actor_profile_id int8;
  current_team text;
  created_notification_id int8 := null;
  target_profile_id int8;
  target_role public.app_role;
  target_team text;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_on_duty is null then
    raise exception 'A duty state is required.' using errcode = '22023';
  end if;

  select profiles.id, profiles.display_name
  into actor_profile_id, actor_display_name
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  select profiles.id, profiles.role
  into target_profile_id, target_role
  from public.profiles as profiles
  where profiles.user_id = p_user_id;

  if target_profile_id is null then
    raise exception 'User profile not found.' using errcode = 'P0002';
  end if;

  if not p_on_duty then
    delete from public.emergency_team_duties
    where emergency_team_duties.profile_id = target_profile_id;

    return query select target_profile_id, false, null::int8;
    return;
  end if;

  target_team := case target_role
    when 'medical_staff'::public.app_role then 'medical'
    when 'organization_team'::public.app_role then 'travel'
    else null
  end;

  if target_team is null then
    raise exception 'Emergency duty requires a medical or organization team role.'
      using errcode = '22023';
  end if;

  select duties.team into current_team
  from public.emergency_team_duties as duties
  where duties.profile_id = target_profile_id;

  if current_team is distinct from target_team then
    insert into public.emergency_team_duties (
      profile_id,
      team,
      assigned_by_profile_id,
      assigned_by_display_name,
      assigned_at
    )
    values (
      target_profile_id,
      target_team,
      actor_profile_id,
      actor_display_name,
      now()
    )
    on conflict (profile_id) do update
    set
      team = excluded.team,
      assigned_by_profile_id = excluded.assigned_by_profile_id,
      assigned_by_display_name = excluded.assigned_by_display_name,
      assigned_at = excluded.assigned_at;

    insert into public.emergency_duty_notifications (
      recipient_profile_id,
      team,
      assigned_by_profile_id,
      assigned_by_display_name
    )
    values (
      target_profile_id,
      target_team,
      actor_profile_id,
      actor_display_name
    )
    returning id into created_notification_id;
  end if;

  return query select target_profile_id, true, created_notification_id;
end;
$$;

create or replace function public.list_emergency_dashboard()
returns table (
  request_id int8,
  requester_display_name text,
  target_team text,
  message text,
  location_label text,
  latitude double precision,
  longitude double precision,
  accuracy_meters double precision,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_role public.app_role;
begin
  select profiles.role into actor_role
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  if actor_role is null or actor_role not in (
    'admin'::public.app_role,
    'medical_staff'::public.app_role,
    'organization_team'::public.app_role
  ) then
    raise exception 'Emergency dashboard access required.' using errcode = '42501';
  end if;

  return query
  select
    requests.id,
    requests.requester_display_name,
    requests.target_team,
    requests.message,
    requests.location_label,
    requests.latitude,
    requests.longitude,
    requests.accuracy_meters,
    requests.created_at
  from public.emergency_requests as requests
  where actor_role = 'admin'::public.app_role
    or (actor_role = 'medical_staff'::public.app_role and requests.target_team = 'medical')
    or (actor_role = 'organization_team'::public.app_role and requests.target_team = 'travel')
  order by requests.created_at desc
  limit 200;
end;
$$;

create or replace function public.list_my_emergency_duty_notifications()
returns table (
  notification_id int8,
  team text,
  assigned_by_display_name text,
  created_at timestamptz,
  read_at timestamptz,
  is_on_duty boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    notifications.id,
    notifications.team,
    notifications.assigned_by_display_name,
    notifications.created_at,
    notifications.read_at,
    exists (
      select 1
      from public.emergency_team_duties as duties
      where duties.profile_id = recipient.id
    )
  from public.profiles as recipient
  join public.emergency_duty_notifications as notifications
    on notifications.recipient_profile_id = recipient.id
  where recipient.user_id = (select auth.uid())
  order by notifications.created_at desc
  limit 50;
$$;

create or replace function public.mark_emergency_duty_notification_read(
  p_notification_id int8
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

  update public.emergency_duty_notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and recipient_profile_id = actor_profile_id;

  if not found then
    raise exception 'Duty notification not found.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.claim_emergency_duty_notification_attempts(
  p_notification_id int8,
  p_assigner_user_id uuid
)
returns table (
  attempt_id int8,
  expo_push_token text,
  locale text,
  notification_id int8,
  team text
)
language sql
security definer
set search_path = ''
as $$
  with due as (
    select
      notifications.id as notification_id,
      notifications.team,
      devices.id as push_device_id,
      devices.expo_push_token,
      devices.locale
    from public.emergency_duty_notifications as notifications
    join public.profiles as assigner
      on assigner.id = notifications.assigned_by_profile_id
      and assigner.user_id = p_assigner_user_id
      and assigner.role = 'admin'::public.app_role
    join public.push_notification_devices as devices
      on devices.profile_id = notifications.recipient_profile_id
    where notifications.id = p_notification_id
  ),
  claimed as (
    insert into public.emergency_duty_notification_attempts (
      notification_id,
      push_device_id
    )
    select due.notification_id, due.push_device_id
    from due
    on conflict do nothing
    returning
      id,
      emergency_duty_notification_attempts.notification_id,
      emergency_duty_notification_attempts.push_device_id
  )
  select
    claimed.id,
    due.expo_push_token,
    due.locale,
    due.notification_id,
    due.team
  from claimed
  join due
    on due.notification_id = claimed.notification_id
    and due.push_device_id = claimed.push_device_id;
$$;

create or replace function public.complete_emergency_duty_notification_attempt(
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
  update public.emergency_duty_notification_attempts
  set
    accepted_at = case when p_accepted then now() else null end,
    error_code = case
      when p_accepted then null
      else left(coalesce(nullif(btrim(p_error_code), ''), 'unknown'), 120)
    end
  where id = p_attempt_id;
end;
$$;

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
  has_assigned_duty boolean;
  target_role public.app_role;
  target_team text;
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

  target_team := case lower(btrim(coalesce(p_target_team, '')))
    when 'medical' then 'medical'
    when 'travel' then 'travel'
    else null
  end;
  target_role := case target_team
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
    target_team,
    clean_message,
    clean_location_label,
    p_latitude,
    p_longitude,
    p_accuracy_meters
  )
  returning id into created_request_id;

  select exists (
    select 1
    from public.emergency_team_duties as duties
    join public.profiles as profiles on profiles.id = duties.profile_id
    where duties.team = target_team
      and profiles.role = target_role
  ) into has_assigned_duty;

  insert into public.emergency_request_recipients (request_id, recipient_profile_id)
  select created_request_id, profiles.id
  from public.profiles as profiles
  where profiles.role = target_role
    and (
      not has_assigned_duty
      or exists (
        select 1
        from public.emergency_team_duties as duties
        where duties.profile_id = profiles.id
          and duties.team = target_team
      )
    );

  return query
  select created_request_id, count(*)::int4
  from public.emergency_request_recipients as recipients
  where recipients.request_id = created_request_id;
end;
$$;

revoke all on function public.clear_emergency_duty_after_role_change() from public, anon, authenticated;
revoke all on function public.admin_list_users() from public, anon;
revoke all on function public.admin_set_emergency_duty(uuid, boolean) from public, anon;
revoke all on function public.list_emergency_dashboard() from public, anon;
revoke all on function public.list_my_emergency_duty_notifications() from public, anon;
revoke all on function public.mark_emergency_duty_notification_read(int8) from public, anon;
revoke all on function public.claim_emergency_duty_notification_attempts(int8, uuid) from public, anon, authenticated;
revoke all on function public.complete_emergency_duty_notification_attempt(int8, boolean, text) from public, anon, authenticated;

grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_emergency_duty(uuid, boolean) to authenticated;
grant execute on function public.list_emergency_dashboard() to authenticated;
grant execute on function public.list_my_emergency_duty_notifications() to authenticated;
grant execute on function public.mark_emergency_duty_notification_read(int8) to authenticated;
grant execute on function public.claim_emergency_duty_notification_attempts(int8, uuid) to service_role;
grant execute on function public.complete_emergency_duty_notification_attempt(int8, boolean, text) to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'emergency_team_duties'
  ) then
    alter publication supabase_realtime add table public.emergency_team_duties;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'emergency_duty_notifications'
  ) then
    alter publication supabase_realtime add table public.emergency_duty_notifications;
  end if;
end;
$$;

notify pgrst, 'reload schema';
