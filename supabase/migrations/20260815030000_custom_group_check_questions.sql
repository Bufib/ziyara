alter table public.group_checks
add column question text;

update public.group_checks
set question = case kind
  when 'bus' then 'Bist du bereits im Bus?'
  when 'control' then 'Bist du mit der Kontrolle fertig?'
end;

alter table public.group_checks
alter column question set not null;

alter table public.group_checks
add constraint group_checks_question_length
check (char_length(btrim(question)) between 3 and 240);

drop function public.start_group_check(public.group_check_kind);

alter table public.group_checks
drop column kind;

drop type public.group_check_kind;

create or replace function public.start_group_check(p_question text)
returns public.group_checks
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_profile_id int8;
  started_check public.group_checks;
  normalized_question text := btrim(p_question);
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if normalized_question is null or char_length(normalized_question) not between 3 and 240 then
    raise exception 'Question must contain between 3 and 240 characters.' using errcode = '22023';
  end if;

  select profiles.id
  into admin_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid())
    and profiles.role = 'admin';

  insert into public.group_checks (question, created_by_profile_id)
  values (normalized_question, admin_profile_id)
  returning * into started_check;

  return started_check;
exception
  when unique_violation then
    raise exception 'A group check is already active.' using errcode = '23505';
end;
$$;

revoke all on function public.start_group_check(text) from public, anon;
grant execute on function public.start_group_check(text) to authenticated;

comment on column public.group_checks.question is
  'Admin-authored question shown on the blocking response screen.';

notify pgrst, 'reload schema';
