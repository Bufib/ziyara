create or replace function public.require_emergency_location_label()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.location_label := nullif(btrim(coalesce(new.location_label, '')), '');

  if new.location_label is null then
    raise exception 'A location description is required for an emergency request.'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger require_emergency_location_label
before insert on public.emergency_requests
for each row execute function public.require_emergency_location_label();

comment on function public.require_emergency_location_label() is
  'Requires a human-readable location for every new emergency request. Precise device coordinates remain optional.';

revoke all on function public.require_emergency_location_label() from public, anon, authenticated;

notify pgrst, 'reload schema';
