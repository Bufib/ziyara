create table public.question_rounds (
  id int8 generated always as identity primary key,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint question_rounds_closed_after_creation
    check (closed_at is null or closed_at >= created_at)
);

comment on table public.question_rounds is
  'Admin-controlled windows during which signed-in users may submit anonymous questions.';

create unique index question_rounds_one_active_idx
on public.question_rounds ((closed_at is null))
where closed_at is null;

create table public.anonymous_questions (
  id int8 generated always as identity primary key,
  round_id int8 not null references public.question_rounds (id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 3 and 500),
  is_checked boolean not null default false,
  created_at timestamptz not null default now(),
  checked_at timestamptz,
  constraint anonymous_questions_checked_state
    check (
      (is_checked and checked_at is not null)
      or (not is_checked and checked_at is null)
    )
);

comment on table public.anonymous_questions is
  'Anonymous question text without a user ID, profile ID, email address, or display name.';

create index anonymous_questions_round_state_idx
on public.anonymous_questions (round_id, is_checked, created_at);

alter table public.question_rounds enable row level security;
alter table public.anonymous_questions enable row level security;

revoke all on table public.question_rounds from anon, authenticated;
revoke all on table public.anonymous_questions from anon, authenticated;
grant select on table public.question_rounds to authenticated;
grant select on table public.anonymous_questions to authenticated;

create policy "Signed-in users can read question rounds"
on public.question_rounds
for select
to authenticated
using (true);

create policy "Only admins can read anonymous questions"
on public.anonymous_questions
for select
to authenticated
using ((select public.is_admin()));

create or replace function public.open_question_round()
returns public.question_rounds
language plpgsql
security definer
set search_path = ''
as $$
declare
  opened_round public.question_rounds;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  insert into public.question_rounds default values
  returning * into opened_round;

  return opened_round;
exception
  when unique_violation then
    raise exception 'A question round is already open.' using errcode = '23505';
end;
$$;

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
  saved_question public.anonymous_questions;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and role = 'user'
  ) then
    raise exception 'Only participant accounts can submit questions.' using errcode = '42501';
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

create or replace function public.set_anonymous_question_checked(
  p_question_id int8,
  p_is_checked boolean
)
returns public.anonymous_questions
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_question public.anonymous_questions;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  update public.anonymous_questions
  set
    is_checked = p_is_checked,
    checked_at = case when p_is_checked then now() else null end
  where id = p_question_id
  returning * into updated_question;

  if updated_question.id is null then
    raise exception 'Anonymous question not found.' using errcode = 'P0002';
  end if;

  return updated_question;
end;
$$;

revoke all on function public.open_question_round() from public, anon;
revoke all on function public.close_question_round(int8) from public, anon;
revoke all on function public.submit_anonymous_question(int8, text) from public, anon;
revoke all on function public.set_anonymous_question_checked(int8, boolean) from public, anon;

grant execute on function public.open_question_round() to authenticated;
grant execute on function public.close_question_round(int8) to authenticated;
grant execute on function public.submit_anonymous_question(int8, text) to authenticated;
grant execute on function public.set_anonymous_question_checked(int8, boolean) to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'question_rounds'
  ) then
    alter publication supabase_realtime add table public.question_rounds;
  end if;

  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'anonymous_questions'
  ) then
    alter publication supabase_realtime add table public.anonymous_questions;
  end if;
end;
$$;

notify pgrst, 'reload schema';
