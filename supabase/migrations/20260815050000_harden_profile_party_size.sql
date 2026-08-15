create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_party_size int8 := 1;
begin
  if coalesce(new.raw_user_meta_data ->> 'party_size', '') ~ '^[0-9]{1,2}$' then
    requested_party_size := least(
      greatest((new.raw_user_meta_data ->> 'party_size')::int8, 1),
      50
    );
  end if;

  insert into public.profiles (user_id, display_name, party_size)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Benutzer'
    ),
    requested_party_size
  );

  return new;
end;
$$;

notify pgrst, 'reload schema';
