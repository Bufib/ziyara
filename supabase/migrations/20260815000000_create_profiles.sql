-- Supabase Auth owns auth.users and uses UUID primary keys internally.
-- App-facing user IDs live in public.profiles as PostgreSQL int8/bigint values.
create table public.profiles (
  id int8 generated always as identity primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public account profiles linked one-to-one to Supabase Auth users.';
comment on column public.profiles.id is 'App-facing int8 primary key.';
comment on column public.profiles.user_id is 'Internal UUID owned by Supabase Auth.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profile_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Benutzer'
    )
  );

  return new;
end;
$$;

create trigger create_profile_after_auth_signup
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Create profiles for accounts that existed before this migration.
insert into public.profiles (user_id, display_name)
select
  users.id,
  coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
    'Benutzer'
  )
from auth.users as users
on conflict (user_id) do nothing;
