create or replace function public.close_group_check(p_check_id int8)
returns public.group_checks
language plpgsql
security definer
set search_path = ''
as $$
declare
  locked_check public.group_checks;
  closed_check public.group_checks;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  -- This exclusive row lock pairs with the shared lock in
  -- respond_to_group_check. A response either commits before this close or,
  -- after waiting, observes the closed check and fails.
  select checks.*
  into locked_check
  from public.group_checks as checks
  where checks.id = p_check_id
    and checks.closed_at is null
  for update;

  if locked_check.id is null then
    raise exception 'Active group check not found.' using errcode = 'P0002';
  end if;

  update public.group_checks
  set closed_at = now()
  where id = locked_check.id
  returning * into closed_check;

  return closed_check;
end;
$$;

comment on function public.close_group_check(int8) is
  'Closes one active group check while serializing against concurrent responses.';

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

  -- Concurrent responses may share this lock. Closing the same check requires
  -- the exclusive lock above and therefore cannot race past this validation.
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

drop function public.admin_group_check_results(int8);

create function public.admin_group_check_results(p_check_id int8)
returns table (
  display_name text,
  party_size int8,
  answer boolean
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

  if not exists (
    select 1
    from public.group_checks as checks
    where checks.id = p_check_id
  ) then
    raise exception 'Group check not found.' using errcode = 'P0002';
  end if;

  return query
  select
    profiles.display_name,
    profiles.party_size,
    responses.answer
  from public.profiles as profiles
  left join public.group_check_responses as responses
    on responses.profile_id = profiles.id
   and responses.check_id = p_check_id
  order by profiles.display_name, profiles.id;
end;
$$;

comment on function public.admin_group_check_results(int8) is
  'Returns every current profile with party size and its nullable response for one group check.';

revoke all on function public.close_group_check(int8) from public, anon;
revoke all on function public.respond_to_group_check(int8, boolean) from public, anon;
revoke all on function public.admin_group_check_results(int8) from public, anon;

grant execute on function public.close_group_check(int8) to authenticated;
grant execute on function public.respond_to_group_check(int8, boolean) to authenticated;
grant execute on function public.admin_group_check_results(int8) to authenticated;

notify pgrst, 'reload schema';
