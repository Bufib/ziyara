alter table public.profiles
add column sim_card_count int8 not null default 0
check (sim_card_count between 0 and 50);

comment on column public.profiles.sim_card_count is
  'Total number of SIM cards needed for all people represented by this account.';

grant update (sim_card_count) on table public.profiles to authenticated;

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
  requested_sim_card_count int8 := 0;
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

  if coalesce(new.raw_user_meta_data ->> 'sim_card_count', '') ~ '^[0-9]{1,2}$' then
    requested_sim_card_count := least(
      greatest((new.raw_user_meta_data ->> 'sim_card_count')::int8, 0),
      50
    );
  end if;

  insert into public.profiles (
    user_id,
    display_name,
    member_type,
    party_size,
    luggage_count,
    sim_card_count
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
    requested_luggage_count,
    requested_sim_card_count
  );

  return new;
end;
$$;

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
    profiles.member_type,
    profiles.party_size,
    profiles.luggage_count,
    profiles.sim_card_count,
    profiles.role,
    families.id,
    families.name
  from public.profiles as profiles
  left join public.account_families as families on families.id = profiles.family_id
  order by families.name nulls last, profiles.display_name, profiles.user_id;
end;
$$;

comment on function public.admin_list_users() is
  'Returns the minimal account data required for gender, people, luggage, SIM-card, role, and family administration.';

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

notify pgrst, 'reload schema';
