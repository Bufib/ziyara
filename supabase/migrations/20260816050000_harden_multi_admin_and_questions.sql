create table public.role_assignment_audit (
  id int8 generated always as identity primary key,
  changed_by_profile_id int8 references public.profiles (id) on delete set null,
  target_user_id uuid not null,
  previous_role public.app_role not null,
  new_role public.app_role not null,
  created_at timestamptz not null default now(),
  constraint role_assignment_audit_changed_role
    check (previous_role <> new_role)
);

comment on table public.role_assignment_audit is
  'Server-side audit trail for role changes made by administrators. It is not exposed through the client API.';

create index role_assignment_audit_target_created_idx
on public.role_assignment_audit (target_user_id, created_at desc);

alter table public.role_assignment_audit enable row level security;
revoke all on table public.role_assignment_audit from anon, authenticated;

create table public.question_submission_limits (
  round_id int8 not null references public.question_rounds (id) on delete cascade,
  profile_id int8 not null references public.profiles (id) on delete cascade,
  submission_count int4 not null default 1,
  primary key (round_id, profile_id),
  constraint question_submission_limits_valid_count
    check (submission_count between 1 and 5)
);

comment on table public.question_submission_limits is
  'Temporary per-round abuse-prevention counters. No question ID, text, or submission timestamp is stored; rows are removed when the round closes.';

alter table public.question_submission_limits enable row level security;
revoke all on table public.question_submission_limits from anon, authenticated;

create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role public.app_role
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_profile_id int8;
  current_target_role public.app_role;
  updated_profile public.profiles;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if p_role is null or p_role not in ('user', 'medical_staff', 'organization_team') then
    raise exception 'This role cannot be assigned from the app.' using errcode = '22023';
  end if;

  select profiles.id
  into admin_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid())
    and profiles.role = 'admin';

  select profiles.role
  into current_target_role
  from public.profiles as profiles
  where profiles.user_id = p_user_id
  for update;

  if not found then
    raise exception 'User profile not found.' using errcode = 'P0002';
  end if;

  if current_target_role = 'admin' then
    raise exception 'Administrator roles are protected.' using errcode = '42501';
  end if;

  if current_target_role = p_role then
    select profiles.*
    into updated_profile
    from public.profiles as profiles
    where profiles.user_id = p_user_id;

    return updated_profile;
  end if;

  update public.profiles
  set role = p_role
  where user_id = p_user_id
  returning * into updated_profile;

  insert into public.role_assignment_audit (
    changed_by_profile_id,
    target_user_id,
    previous_role,
    new_role
  )
  values (admin_profile_id, p_user_id, current_target_role, p_role);

  return updated_profile;
end;
$$;

comment on function public.admin_set_user_role(uuid, public.app_role) is
  'Serializes and audits assignments of non-admin application roles. Administrator roles remain protected.';

create or replace function public.respond_to_group_check(p_check_id int8, p_answer boolean)
returns public.group_check_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  responder_profile_id int8;
  saved_response public.group_check_responses;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select profiles.id
  into responder_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  if responder_profile_id is null then
    raise exception 'A user profile is required to respond.' using errcode = '42501';
  end if;

  perform 1
  from public.group_checks
  where id = p_check_id
    and closed_at is null
  for share;

  if not found then
    raise exception 'Active group check not found.' using errcode = 'P0002';
  end if;

  insert into public.group_check_responses (check_id, profile_id, answer)
  values (p_check_id, responder_profile_id, p_answer)
  on conflict (check_id, profile_id)
  do update set answer = excluded.answer
  returning * into saved_response;

  return saved_response;
end;
$$;

comment on function public.respond_to_group_check(int8, boolean) is
  'Stores one changeable response for any signed-in profile while serializing against check closure.';

create or replace function public.close_question_round(p_round_id int8)
returns public.question_rounds
language plpgsql
security definer
set search_path = ''
as $$
declare
  closed_round public.question_rounds;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  update public.question_rounds
  set closed_at = now()
  where id = p_round_id
    and closed_at is null
  returning * into closed_round;

  if closed_round.id is null then
    raise exception 'Open question round not found.' using errcode = 'P0002';
  end if;

  delete from public.question_submission_limits
  where round_id = p_round_id;

  return closed_round;
end;
$$;

create or replace function public.submit_anonymous_question(p_round_id int8, p_question text)
returns public.anonymous_questions
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_question text := btrim(p_question);
  submitter_profile_id int8;
  updated_submission_count int4;
  saved_question public.anonymous_questions;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select profiles.id
  into submitter_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  if submitter_profile_id is null then
    raise exception 'A user profile is required to submit questions.' using errcode = '42501';
  end if;

  if normalized_question is null or char_length(normalized_question) not between 3 and 500 then
    raise exception 'Question must contain between 3 and 500 characters.' using errcode = '22023';
  end if;

  perform 1
  from public.question_rounds
  where id = p_round_id
    and closed_at is null
  for share;

  if not found then
    raise exception 'Open question round not found.' using errcode = 'P0002';
  end if;

  insert into public.question_submission_limits (round_id, profile_id, submission_count)
  values (p_round_id, submitter_profile_id, 1)
  on conflict (round_id, profile_id)
  do update
    set submission_count = public.question_submission_limits.submission_count + 1
    where public.question_submission_limits.submission_count < 5
  returning submission_count into updated_submission_count;

  if updated_submission_count is null then
    raise exception 'Question submission limit reached.' using errcode = 'P0001';
  end if;

  insert into public.anonymous_questions (round_id, question)
  values (p_round_id, normalized_question)
  returning * into saved_question;

  return saved_question;
end;
$$;

comment on function public.submit_anonymous_question(int8, text) is
  'Stores up to five anonymous questions per signed-in profile and round. Question rows never persist the profile or user ID.';

notify pgrst, 'reload schema';
