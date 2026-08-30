create table public.account_families (
  id int8 generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  created_by_profile_id int8 references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index account_families_name_unique_idx
on public.account_families (lower(btrim(name)));

comment on table public.account_families is
  'Admin-managed families that group app accounts independently from physical trip groups and represented-person counts.';

alter table public.profiles
add column luggage_count int8 not null default 0
check (luggage_count between 0 and 50),
add column family_id int8 references public.account_families (id) on delete set null;

create index profiles_family_id_idx
on public.profiles (family_id)
where family_id is not null;

comment on column public.profiles.luggage_count is
  'Total number of suitcases registered for all people represented by this account.';
comment on column public.profiles.family_id is
  'Optional admin-managed account family. This is independent from party_size and physical trip groups.';

grant update (luggage_count) on table public.profiles to authenticated;

alter table public.account_families enable row level security;

revoke all on table public.account_families from anon, authenticated;
grant select on table public.account_families to authenticated;

create policy "Admins and assigned members can read account families"
on public.account_families
for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.profiles as own_profile
    where own_profile.user_id = (select auth.uid())
      and own_profile.family_id = account_families.id
  )
);

create trigger set_account_families_updated_at
before update on public.account_families
for each row
execute function public.set_profile_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_luggage_count int8 := 0;
  requested_member_type public.member_type := null;
  requested_party_size int8 := 1;
begin
  if coalesce(new.raw_user_meta_data ->> 'member_type', '') in ('brother', 'sister') then
    requested_member_type := (new.raw_user_meta_data ->> 'member_type')::public.member_type;
  end if;

  if coalesce(new.raw_user_meta_data ->> 'party_size', '') ~ '^[0-9]{1,2}$' then
    requested_party_size := least(
      greatest((new.raw_user_meta_data ->> 'party_size')::int8, 1),
      50
    );
  end if;

  if coalesce(new.raw_user_meta_data ->> 'luggage_count', '') ~ '^[0-9]{1,2}$' then
    requested_luggage_count := least(
      greatest((new.raw_user_meta_data ->> 'luggage_count')::int8, 0),
      50
    );
  end if;

  insert into public.profiles (
    user_id,
    display_name,
    member_type,
    party_size,
    luggage_count
  )
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Benutzer'
    ),
    requested_member_type,
    requested_party_size,
    requested_luggage_count
  );

  return new;
end;
$$;

drop function public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  user_id uuid,
  display_name text,
  party_size int8,
  luggage_count int8,
  role public.app_role,
  family_id int8,
  family_name text
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
    profiles.party_size,
    profiles.luggage_count,
    profiles.role,
    families.id,
    families.name
  from public.profiles as profiles
  left join public.account_families as families on families.id = profiles.family_id
  order by families.name nulls last, profiles.display_name, profiles.user_id;
end;
$$;

comment on function public.admin_list_users() is
  'Returns the minimal account assignment data required for roles, luggage totals, and admin-managed families.';

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_list_account_families()
returns setof public.account_families
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
  select families.*
  from public.account_families as families
  order by families.name, families.id;
end;
$$;

comment on function public.admin_list_account_families() is
  'Lists account families for authenticated administrators without exposing unrelated profile data.';

revoke all on function public.admin_list_account_families() from public, anon;
grant execute on function public.admin_list_account_families() to authenticated;

create or replace function public.admin_upsert_account_family(
  p_name text,
  p_member_user_ids uuid[],
  p_family_id int8 default null
)
returns public.account_families
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id int8;
  normalized_member_user_ids uuid[];
  saved_family public.account_families;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception 'Family name must contain between 2 and 80 characters.'
      using errcode = '22023';
  end if;

  select array_agg(member_user_id order by member_user_id)
  into normalized_member_user_ids
  from (
    select distinct member_user_id
    from unnest(coalesce(p_member_user_ids, '{}'::uuid[])) as member_user_id
    where member_user_id is not null
  ) as normalized_members;

  if coalesce(cardinality(normalized_member_user_ids), 0) = 0 then
    raise exception 'At least one family member is required.' using errcode = '22023';
  end if;

  if cardinality(normalized_member_user_ids) > 200 then
    raise exception 'A family cannot contain more than 200 accounts.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(2026083001);

  if (
    select count(*)
    from public.profiles as selected_profiles
    where selected_profiles.user_id = any(normalized_member_user_ids)
  ) <> cardinality(normalized_member_user_ids) then
    raise exception 'One or more user profiles were not found.' using errcode = 'P0002';
  end if;

  perform selected_profiles.id
  from public.profiles as selected_profiles
  where selected_profiles.user_id = any(normalized_member_user_ids)
  order by selected_profiles.user_id
  for update;

  select profiles.id into actor_profile_id
  from public.profiles as profiles
  where profiles.user_id = (select auth.uid());

  if p_family_id is null then
    insert into public.account_families (name, created_by_profile_id)
    values (btrim(p_name), actor_profile_id)
    returning * into saved_family;
  else
    update public.account_families as families
    set name = btrim(p_name)
    where families.id = p_family_id
    returning families.* into saved_family;

    if saved_family.id is null then
      raise exception 'Account family not found.' using errcode = 'P0002';
    end if;

    update public.profiles
    set family_id = null
    where family_id = saved_family.id;
  end if;

  update public.profiles
  set family_id = saved_family.id
  where user_id = any(normalized_member_user_ids);

  return saved_family;
end;
$$;

comment on function public.admin_upsert_account_family(text, uuid[], int8) is
  'Creates or updates one account family and atomically assigns the selected app accounts. Selecting an account moves it from its previous family.';

revoke all on function public.admin_upsert_account_family(text, uuid[], int8)
from public, anon;
grant execute on function public.admin_upsert_account_family(text, uuid[], int8)
to authenticated;

create or replace function public.admin_delete_account_family(p_family_id int8)
returns public.account_families
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_family public.account_families;
begin
  if (select auth.uid()) is null or not (select public.is_admin()) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(2026083001);

  delete from public.account_families as families
  where families.id = p_family_id
  returning families.* into deleted_family;

  if deleted_family.id is null then
    raise exception 'Account family not found.' using errcode = 'P0002';
  end if;

  return deleted_family;
end;
$$;

comment on function public.admin_delete_account_family(int8) is
  'Deletes one account family. Member profiles remain and are unassigned through the foreign key.';

revoke all on function public.admin_delete_account_family(int8) from public, anon;
grant execute on function public.admin_delete_account_family(int8) to authenticated;

notify pgrst, 'reload schema';
