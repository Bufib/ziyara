alter type public.app_role add value if not exists 'medical_staff';
alter type public.app_role add value if not exists 'organization_team';

comment on type public.app_role is
  'Application role: regular user, medical staff, organization team member, or protected administrator.';

notify pgrst, 'reload schema';
