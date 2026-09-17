-- Demo seed for local development (`supabase db reset`).
-- Cloud projects: sign up through the app or adapt these UUIDs manually.

create extension if not exists pgcrypto;

-- Demo auth user: demo@pulse.dev / password123
insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '11111111-1111-1111-1111-111111111111',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@pulse.dev',
  crypt('password123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Demo Commander"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'demo@pulse.dev'),
  'email',
  now(),
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.organizations (id, name, slug, settings)
values (
  '22222222-2222-2222-2222-222222222222',
  'Pulse Demo Org',
  'pulse-demo',
  '{"slaThresholds":{"sev1":{"acknowledgeMinutes":5,"resolveMinutes":60},"sev2":{"acknowledgeMinutes":15,"resolveMinutes":240},"sev3":{"acknowledgeMinutes":30,"resolveMinutes":480},"sev4":{"acknowledgeMinutes":60,"resolveMinutes":1440}}}'::jsonb
)
on conflict (id) do nothing;

insert into public.profiles (id, org_id, email, display_name, org_role, is_active)
values (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'demo@pulse.dev',
  'Demo Commander',
  'owner',
  true
)
on conflict (id) do nothing;

insert into public.incidents (
  id,
  org_id,
  title,
  description,
  severity,
  status,
  declared_by,
  commander_id,
  declared_at,
  acknowledged_at,
  resolved_at
)
values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Checkout API latency spike',
  'Elevated p95 latency on payment service after deploy v2.14.',
  'sev2',
  'resolved',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  now() - interval '3 days',
  now() - interval '3 days' + interval '8 minutes',
  now() - interval '2 days'
)
on conflict (id) do nothing;

insert into public.incident_participants (
  incident_id,
  org_id,
  user_id,
  incident_role,
  is_active
)
values (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'commander',
  true
)
on conflict do nothing;

insert into public.post_mortems (
  id,
  incident_id,
  org_id,
  authored_by,
  summary,
  timeline_narrative,
  root_cause,
  contributing_factors,
  lessons_learned,
  is_published,
  published_at,
  is_stakeholder_visible
)
values (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Payment API latency exceeded SLO for 22 minutes during peak traffic.',
  'Deploy at 14:02 UTC introduced a connection pool regression. Rollback completed at 14:24 UTC.',
  'Connection pool max size was reduced in v2.14 config.',
  'Missing load test on checkout path; alert threshold too high.',
  'Add pool utilization dashboards and canary deploy gate.',
  true,
  now() - interval '1 day',
  true
)
on conflict (incident_id) do nothing;

insert into public.action_items (
  id,
  post_mortem_id,
  incident_id,
  org_id,
  title,
  assignee_id,
  status,
  due_at,
  completed_at
)
values (
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'Add connection pool saturation alert',
  '11111111-1111-1111-1111-111111111111',
  'open',
  now() + interval '7 days',
  null
)
on conflict (id) do nothing;

insert into public.escalation_policies (
  org_id,
  severity,
  acknowledge_threshold_minutes,
  resolve_threshold_minutes
)
select
  '22222222-2222-2222-2222-222222222222',
  severity,
  case severity
    when 'sev1' then 5
    when 'sev2' then 15
    when 'sev3' then 30
    else 60
  end,
  case severity
    when 'sev1' then 60
    when 'sev2' then 240
    when 'sev3' then 480
    else 1440
  end
from unnest(enum_range(null::public.severity_level)) as severity
on conflict (org_id, severity) do nothing;
