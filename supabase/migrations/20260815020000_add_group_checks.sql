create type public.group_check_kind as enum ('bus', 'control');

create table public.group_checks (
  id int8 generated always as identity primary key,
  kind public.group_check_kind not null,
  created_by_profile_id int8 references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint group_checks_closed_after_creation
    check (closed_at is null or closed_at >= created_at)
);

comment on table public.group_checks is
  'Admin-created blocking status questions shown to every signed-in non-admin user.';

create unique index group_checks_one_active_idx
on public.group_checks ((closed_at is null))
where closed_at is null;

create table public.group_check_responses (
  id int8 generated always as identity primary key,
  check_id int8 not null references public.group_checks (id) on delete cascade,
  profile_id int8 not null references public.profiles (id) on delete cascade,
  answer boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (check_id, profile_id)
);

comment on table public.group_check_responses is
  'One yes/no response per non-admin profile and group check.';

create index group_check_responses_check_answer_idx
on public.group_check_responses (check_id, answer);

alter table public.group_checks enable row level security;
alter table public.group_check_responses enable row level security;

revoke all on table public.group_checks from anon, authenticated;
revoke all on table public.group_check_responses from anon, authenticated;
grant select on table public.group_checks to authenticated;
grant select on table public.group_check_responses to authenticated;

create policy "Signed-in users can read group checks"
on public.group_checks
for select
to authenticated
using (true);

create policy "Users read own responses and admins read all"
on public.group_check_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = group_check_responses.profile_id
      and profiles.user_id = (select auth.uid())
  )
  or (select public.is_admin())
);

create or replace function public.set_group_check_response_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_group_check_responses_updated_at
before update on public.group_check_responses
for each row
execute function public.set_group_check_response_updated_at();

create or replace function public.start_group_check(p_kind public.group_check_kind)
returns public.group_checks
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_profile_id int8;
  started_check public.group_checks;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select profiles.id
  into admin_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid())
    and profiles.role = 'admin';

  insert into public.group_checks (kind, created_by_profile_id)
  values (p_kind, admin_profile_id)
  returning * into started_check;

  return started_check;
exception
  when unique_violation then
    raise exception 'A group check is already active.' using errcode = '23505';
end;
$$;

create or replace function public.close_group_check(p_check_id int8)
returns public.group_checks
language plpgsql
security definer
set search_path = ''
as $$
declare
  closed_check public.group_checks;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  update public.group_checks
  set closed_at = now()
  where id = p_check_id
    and closed_at is null
  returning * into closed_check;

  if closed_check.id is null then
    raise exception 'Active group check not found.' using errcode = 'P0002';
  end if;

  return closed_check;
end;
$$;

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
  where profiles.user_id = (select auth.uid())
    and profiles.role = 'user';

  if responder_profile_id is null then
    raise exception 'Only participant accounts can respond.' using errcode = '42501';
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

create or replace function public.admin_group_check_results(p_check_id int8)
returns table (
  display_name text,
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

  return query
  select profiles.display_name, responses.answer
  from public.group_check_responses as responses
  join public.profiles as profiles on profiles.id = responses.profile_id
  where responses.check_id = p_check_id
  order by profiles.display_name;
end;
$$;

revoke all on function public.start_group_check(public.group_check_kind) from public, anon;
revoke all on function public.close_group_check(int8) from public, anon;
revoke all on function public.respond_to_group_check(int8, boolean) from public, anon;
revoke all on function public.admin_group_check_results(int8) from public, anon;

grant execute on function public.start_group_check(public.group_check_kind) to authenticated;
grant execute on function public.close_group_check(int8) to authenticated;
grant execute on function public.respond_to_group_check(int8, boolean) to authenticated;
grant execute on function public.admin_group_check_results(int8) to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_checks'
  ) then
    alter publication supabase_realtime add table public.group_checks;
  end if;

  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_check_responses'
  ) then
    alter publication supabase_realtime add table public.group_check_responses;
  end if;
end;
$$;

notify pgrst, 'reload schema';
