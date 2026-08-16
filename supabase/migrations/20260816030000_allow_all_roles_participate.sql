comment on table public.group_checks is
  'Admin-created blocking status questions shown to every signed-in profile. Non-admin profiles are blocked until the check closes; admins can participate without losing app access.';

comment on table public.group_check_responses is
  'One yes/no response per signed-in profile and group check.';

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
    and closed_at is null;

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
  'Stores one changeable response for any signed-in profile, including administrators and staff roles.';

create or replace function public.submit_anonymous_question(p_round_id int8, p_question text)
returns public.anonymous_questions
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_question text := btrim(p_question);
  saved_question public.anonymous_questions;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
  ) then
    raise exception 'A user profile is required to submit questions.' using errcode = '42501';
  end if;

  if normalized_question is null or char_length(normalized_question) not between 3 and 500 then
    raise exception 'Question must contain between 3 and 500 characters.' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.question_rounds
    where id = p_round_id
      and closed_at is null
  ) then
    raise exception 'Open question round not found.' using errcode = 'P0002';
  end if;

  insert into public.anonymous_questions (round_id, question)
  values (p_round_id, normalized_question)
  returning * into saved_question;

  return saved_question;
end;
$$;

comment on function public.submit_anonymous_question(int8, text) is
  'Stores an anonymous question from any signed-in profile without persisting its profile or user ID.';

notify pgrst, 'reload schema';
