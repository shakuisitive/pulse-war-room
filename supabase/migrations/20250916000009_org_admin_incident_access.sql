-- Milestone 2: Allow org admins to manage incidents without being participants

create or replace function public.can_write_incident_core(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_admin()
    or public.is_incident_commander(p_incident_id);
$$;

create or replace function public.can_post_chat(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_admin()
    or public.get_incident_role(p_incident_id) in ('commander', 'responder');
$$;

create or replace function public.can_manage_tasks(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_org_admin()
    or public.get_incident_role(p_incident_id) in ('commander', 'responder');
$$;

drop policy if exists "Commanders can create tasks" on public.tasks;

create policy "Commanders can create tasks"
  on public.tasks for insert to authenticated
  with check (
    org_id = public.jwt_org_id()
    and (
      public.is_org_admin()
      or public.is_incident_commander(incident_id)
    )
  );

drop policy if exists "Commanders can add participants" on public.incident_participants;

create policy "Commanders can add participants"
  on public.incident_participants for insert to authenticated
  with check (
    org_id = public.jwt_org_id()
    and (
      public.is_org_admin()
      or public.is_incident_commander(incident_id)
    )
  );

drop policy if exists "Commanders can update participants" on public.incident_participants;

create policy "Commanders can update participants"
  on public.incident_participants for update to authenticated
  using (
    org_id = public.jwt_org_id()
    and (
      public.is_org_admin()
      or public.is_incident_commander(incident_id)
    )
  )
  with check (org_id = public.jwt_org_id());

drop policy if exists "Commanders can remove participants" on public.incident_participants;

create policy "Commanders can remove participants"
  on public.incident_participants for delete to authenticated
  using (
    org_id = public.jwt_org_id()
    and (
      public.is_org_admin()
      or public.is_incident_commander(incident_id)
    )
  );
