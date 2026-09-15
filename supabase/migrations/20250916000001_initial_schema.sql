-- Milestone 1: Full Pulse schema — enums, tables, indexes
-- Every tenant-scoped table carries org_id for RLS isolation (PRODUCT.md §8)

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "vector" with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.org_role as enum ('owner', 'admin', 'member');

create type public.incident_role as enum (
  'commander',
  'responder',
  'observer',
  'stakeholder'
);

create type public.incident_status as enum (
  'declared',
  'investigating',
  'identified',
  'monitoring',
  'resolved'
);

create type public.severity_level as enum ('sev1', 'sev2', 'sev3', 'sev4');

create type public.task_status as enum ('pending', 'in_progress', 'completed');

create type public.action_item_status as enum ('open', 'in_progress', 'completed');

create type public.notification_type as enum (
  'incident_assigned',
  'task_assigned',
  'mentioned',
  'sla_warning',
  'escalation',
  'postmortem_published'
);

create type public.rotation_type as enum ('weekly', 'daily', 'custom');

create type public.timeline_entry_type as enum (
  'incident_declared',
  'severity_changed',
  'status_changed',
  'participant_joined',
  'participant_left',
  'task_created',
  'task_completed',
  'evidence_uploaded',
  'commander_reassigned',
  'escalation_triggered',
  'ai_summary_generated'
);

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  org_role public.org_role not null default 'member',
  display_name text not null,
  avatar_url text,
  is_active boolean not null default true,
  notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_one_org_per_user unique (id)
);

create index profiles_org_id_idx on public.profiles (org_id);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  severity public.severity_level not null default 'sev3',
  status public.incident_status not null default 'declared',
  commander_id uuid references public.profiles (id) on delete set null,
  declared_by uuid references public.profiles (id) on delete set null,
  declared_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector,
  embedding extensions.vector (1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index incidents_org_status_severity_idx
  on public.incidents (org_id, status, severity);

create index incidents_org_created_at_idx
  on public.incidents (org_id, created_at desc);

create index incidents_open_org_id_idx
  on public.incidents (org_id)
  where status <> 'resolved';

create index incidents_search_vector_idx
  on public.incidents using gin (search_vector);

create index incidents_metadata_idx
  on public.incidents using gin (metadata);

create index incidents_embedding_idx
  on public.incidents using hnsw (embedding extensions.vector_cosine_ops);

create table public.incident_participants (
  incident_id uuid not null references public.incidents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  incident_role public.incident_role not null,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  is_active boolean not null default true,
  primary key (incident_id, user_id)
);

create index incident_participants_org_id_idx
  on public.incident_participants (org_id);

create table public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  entry_type public.timeline_entry_type not null,
  content text not null default '',
  actor_id uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  is_stakeholder_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create index timeline_entries_incident_created_at_idx
  on public.timeline_entries (incident_id, created_at);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  is_stakeholder_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create index chat_messages_incident_created_at_idx
  on public.chat_messages (incident_id, created_at);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  assignee_id uuid references public.profiles (id) on delete set null,
  status public.task_status not null default 'pending',
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_incident_status_idx on public.tasks (incident_id, status);

create index tasks_assignee_open_idx
  on public.tasks (assignee_id, status)
  where status <> 'completed';

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_type text not null,
  file_size bigint not null,
  caption text,
  is_stakeholder_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.post_mortems (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null unique references public.incidents (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  authored_by uuid references public.profiles (id) on delete set null,
  summary text not null default '',
  timeline_narrative text not null default '',
  root_cause text not null default '',
  contributing_factors text not null default '',
  lessons_learned text not null default '',
  is_published boolean not null default false,
  published_at timestamptz,
  is_stakeholder_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  post_mortem_id uuid not null references public.post_mortems (id) on delete cascade,
  incident_id uuid not null references public.incidents (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  assignee_id uuid references public.profiles (id) on delete set null,
  status public.action_item_status not null default 'open',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index action_items_assignee_status_idx
  on public.action_items (assignee_id, status);

create table public.on_call_rotations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  rotation_type public.rotation_type not null default 'weekly',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.on_call_slots (
  id uuid primary key default gen_random_uuid(),
  rotation_id uuid not null references public.on_call_rotations (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  day_of_week smallint check (day_of_week between 0 and 6),
  created_at timestamptz not null default now()
);

create table public.escalation_policies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  severity public.severity_level not null,
  acknowledge_threshold_minutes integer not null,
  resolve_threshold_minutes integer not null,
  escalation_action jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint escalation_policies_org_severity_unique unique (org_id, severity)
);

create table public.webhook_integrations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  endpoint_slug text not null,
  signing_secret text not null,
  payload_mapping jsonb not null default '{}'::jsonb,
  default_severity public.severity_level not null default 'sev3',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint webhook_integrations_org_slug_unique unique (org_id, endpoint_slug)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_type public.notification_type not null,
  title text not null,
  body text not null default '',
  incident_id uuid references public.incidents (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_unread_idx
  on public.notifications (user_id, is_read, created_at desc);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete set null,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_org_created_at_idx
  on public.audit_log (org_id, created_at desc);
