-- Milestone 3: Stakeholder read policies and helper functions

create or replace function public.is_incident_stakeholder(p_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_incident_role(p_incident_id) = 'stakeholder';
$$;

create or replace function public.is_stakeholder_only_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.incident_participants ip
    where ip.user_id = auth.uid()
      and ip.is_active = true
  )
  and not exists (
    select 1
    from public.incident_participants ip
    where ip.user_id = auth.uid()
      and ip.is_active = true
      and ip.incident_role <> 'stakeholder'
  )
  and not public.is_org_admin();
$$;

-- Stakeholders: incident summary only for incidents they are on
create policy "Stakeholders can read assigned incidents"
  on public.incidents for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.is_incident_stakeholder(id)
  );

create policy "Stakeholders can read visible timeline entries"
  on public.timeline_entries for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.is_incident_stakeholder(incident_id)
    and is_stakeholder_visible = true
  );

create policy "Stakeholders can read visible evidence"
  on public.evidence for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.is_incident_stakeholder(incident_id)
    and is_stakeholder_visible = true
  );

create policy "Stakeholders can read visible chat messages"
  on public.chat_messages for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.is_incident_stakeholder(incident_id)
    and is_stakeholder_visible = true
  );

create policy "Stakeholders can read published post-mortems"
  on public.post_mortems for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.is_incident_stakeholder(incident_id)
    and is_published = true
    and is_stakeholder_visible = true
  );

-- Commander can invite stakeholders (already covered by commander/admin participant insert with stakeholder role)
