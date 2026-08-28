alter type public.bus_boarding_status add value if not exists 'read' before 'on_way';

notify pgrst, 'reload schema';
