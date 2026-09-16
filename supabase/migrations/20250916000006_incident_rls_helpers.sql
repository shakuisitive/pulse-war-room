-- Milestone 2: Incident-level RLS helpers and refined policies

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.get_incident_role(p_incident_id uuid)
returns public.incident_role
language sql
stable
security definer
set search_path = public
as $$
  select ip.incident_role
  from public.incident_participants ip
  where ip.incident_id = p_incident_id
    and ip.user_id = auth.uid()
    and ip.is_active = true;
$$;

create or replace function public.is_incident_participant(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.incident_participants ip
    where ip.incident_id = p_incident_id
      and ip.user_id = auth.uid()
      and ip.is_active = true
  );
$$;

create or replace function public.is_incident_commander(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_incident_role(p_incident_id) = 'commander';
$$;

create or replace function public.can_write_incident_core(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_incident_commander(p_incident_id);
$$;

create or replace function public.can_post_chat(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_incident_role(p_incident_id) in ('commander', 'responder');
$$;

create or replace function public.can_read_full_war_room(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_org_admin()
    or public.get_incident_role(p_incident_id) in (
      'commander',
      'responder',
      'observer'
    );
$$;

create or replace function public.can_manage_tasks(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_incident_role(p_incident_id) in ('commander', 'responder');
$$;

-- ---------------------------------------------------------------------------
-- Drop Milestone 1 baseline incident policies
-- ---------------------------------------------------------------------------

drop policy if exists "Org members can read incidents" on public.incidents;
drop policy if exists "Org members can insert incidents" on public.incidents;
drop policy if exists "Org members can update incidents" on public.incidents;

drop policy if exists "Org members can read incident participants" on public.incident_participants;
drop policy if exists "Org members can manage incident participants" on public.incident_participants;

drop policy if exists "Org members can read timeline entries" on public.timeline_entries;
drop policy if exists "Org members can insert timeline entries" on public.timeline_entries;

drop policy if exists "Org members can read chat messages" on public.chat_messages;
drop policy if exists "Org members can insert chat messages" on public.chat_messages;

drop policy if exists "Org members can read tasks" on public.tasks;
drop policy if exists "Org members can manage tasks" on public.tasks;

drop policy if exists "Org members can read evidence" on public.evidence;
drop policy if exists "Org members can upload evidence" on public.evidence;

-- ---------------------------------------------------------------------------
-- incidents
-- ---------------------------------------------------------------------------

create policy "Org members can read incidents in their org"
  on public.incidents for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org members can declare incidents"
  on public.incidents for insert to authenticated
  with check (
    org_id = public.jwt_org_id()
    and declared_by = auth.uid()
  );

create policy "Commanders can update incidents"
  on public.incidents for update to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.can_write_incident_core(id)
  )
  with check (org_id = public.jwt_org_id());

-- ---------------------------------------------------------------------------
-- incident_participants
-- ---------------------------------------------------------------------------

create policy "Participants and admins can read incident participants"
  on public.incident_participants for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and (
      public.is_org_admin()
      or public.is_incident_participant(incident_id)
    )
  );

create policy "Commanders can add participants"
  on public.incident_participants for insert to authenticated
  with check (
    org_id = public.jwt_org_id()
    and public.is_incident_commander(incident_id)
  );

create policy "Commanders can update participants"
  on public.incident_participants for update to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.is_incident_commander(incident_id)
  )
  with check (org_id = public.jwt_org_id());

create policy "Commanders can remove participants"
  on public.incident_participants for delete to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.is_incident_commander(incident_id)
  );

-- ---------------------------------------------------------------------------
-- timeline_entries (read-only for clients; inserts via triggers)
-- ---------------------------------------------------------------------------

create policy "War room participants can read timeline"
  on public.timeline_entries for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.can_read_full_war_room(incident_id)
  );

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------

create policy "War room participants can read chat"
  on public.chat_messages for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.can_read_full_war_room(incident_id)
  );

create policy "Commanders and responders can post chat"
  on public.chat_messages for insert to authenticated
  with check (
    org_id = public.jwt_org_id()
    and sender_id = auth.uid()
    and public.can_post_chat(incident_id)
  );

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

create policy "War room participants can read tasks"
  on public.tasks for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.can_read_full_war_room(incident_id)
  );

create policy "Commanders can create tasks"
  on public.tasks for insert to authenticated
  with check (
    org_id = public.jwt_org_id()
    and public.is_incident_commander(incident_id)
  );

create policy "Commanders can update any task"
  on public.tasks for update to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.is_incident_commander(incident_id)
  )
  with check (org_id = public.jwt_org_id());

create policy "Responders can update assigned tasks"
  on public.tasks for update to authenticated
  using (
    org_id = public.jwt_org_id()
    and assignee_id = auth.uid()
    and public.get_incident_role(incident_id) = 'responder'
  )
  with check (org_id = public.jwt_org_id());

create policy "Commanders can delete tasks"
  on public.tasks for delete to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.is_incident_commander(incident_id)
  );

-- ---------------------------------------------------------------------------
-- evidence
-- ---------------------------------------------------------------------------

create policy "War room participants can read evidence"
  on public.evidence for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.can_read_full_war_room(incident_id)
  );

create policy "Commanders and responders can upload evidence"
  on public.evidence for insert to authenticated
  with check (
    org_id = public.jwt_org_id()
    and uploaded_by = auth.uid()
    and public.can_manage_tasks(incident_id)
  );
