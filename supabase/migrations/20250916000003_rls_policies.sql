-- Milestone 1: Row Level Security — org isolation + basic role checks
-- Incident-level policies will be refined in Milestone 2

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_participants enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.chat_messages enable row level security;
alter table public.tasks enable row level security;
alter table public.evidence enable row level security;
alter table public.post_mortems enable row level security;
alter table public.action_items enable row level security;
alter table public.on_call_rotations enable row level security;
alter table public.on_call_slots enable row level security;
alter table public.escalation_policies enable row level security;
alter table public.webhook_integrations enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

create policy "Members can read their organization"
  on public.organizations for select
  to authenticated
  using (id = public.jwt_org_id());

create policy "Authenticated users can create organizations via RPC"
  on public.organizations for insert
  to authenticated
  with check (true);

create policy "Org admins can update their organization"
  on public.organizations for update
  to authenticated
  using (id = public.jwt_org_id() and public.is_org_admin())
  with check (id = public.jwt_org_id() and public.is_org_admin());

create policy "Org owners can delete their organization"
  on public.organizations for delete
  to authenticated
  using (id = public.jwt_org_id() and public.jwt_org_role() = 'owner');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "Members can read profiles in their org"
  on public.profiles for select
  to authenticated
  using (org_id = public.jwt_org_id());

create policy "Users can insert their own profile during org setup"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() and org_id = public.jwt_org_id())
  with check (id = auth.uid() and org_id = public.jwt_org_id());

create policy "Org admins can update member profiles in their org"
  on public.profiles for update
  to authenticated
  using (org_id = public.jwt_org_id() and public.is_org_admin())
  with check (org_id = public.jwt_org_id() and public.is_org_admin());

create policy "Org admins can delete members from their org"
  on public.profiles for delete
  to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.is_org_admin()
    and id <> auth.uid()
    and org_role <> 'owner'
  );

-- ---------------------------------------------------------------------------
-- Org-scoped tables — read/write gated by org_id (Milestone 1 baseline)
-- ---------------------------------------------------------------------------

create policy "Org members can read incidents"
  on public.incidents for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org members can insert incidents"
  on public.incidents for insert to authenticated
  with check (org_id = public.jwt_org_id());

create policy "Org members can update incidents"
  on public.incidents for update to authenticated
  using (org_id = public.jwt_org_id())
  with check (org_id = public.jwt_org_id());

create policy "Org members can read incident participants"
  on public.incident_participants for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org members can manage incident participants"
  on public.incident_participants for all to authenticated
  using (org_id = public.jwt_org_id())
  with check (org_id = public.jwt_org_id());

create policy "Org members can read timeline entries"
  on public.timeline_entries for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org members can insert timeline entries"
  on public.timeline_entries for insert to authenticated
  with check (org_id = public.jwt_org_id());

create policy "Org members can read chat messages"
  on public.chat_messages for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org members can insert chat messages"
  on public.chat_messages for insert to authenticated
  with check (org_id = public.jwt_org_id() and sender_id = auth.uid());

create policy "Org members can read tasks"
  on public.tasks for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org members can manage tasks"
  on public.tasks for all to authenticated
  using (org_id = public.jwt_org_id())
  with check (org_id = public.jwt_org_id());

create policy "Org members can read evidence"
  on public.evidence for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org members can upload evidence"
  on public.evidence for insert to authenticated
  with check (org_id = public.jwt_org_id() and uploaded_by = auth.uid());

create policy "Org members can read post mortems"
  on public.post_mortems for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org members can manage post mortems"
  on public.post_mortems for all to authenticated
  using (org_id = public.jwt_org_id())
  with check (org_id = public.jwt_org_id());

create policy "Org members can read action items"
  on public.action_items for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org members can manage action items"
  on public.action_items for all to authenticated
  using (org_id = public.jwt_org_id())
  with check (org_id = public.jwt_org_id());

create policy "Org members can read on-call rotations"
  on public.on_call_rotations for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org admins can manage on-call rotations"
  on public.on_call_rotations for all to authenticated
  using (org_id = public.jwt_org_id() and public.is_org_admin())
  with check (org_id = public.jwt_org_id() and public.is_org_admin());

create policy "Org members can read on-call slots"
  on public.on_call_slots for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org admins can manage on-call slots"
  on public.on_call_slots for all to authenticated
  using (org_id = public.jwt_org_id() and public.is_org_admin())
  with check (org_id = public.jwt_org_id() and public.is_org_admin());

create policy "Org members can read escalation policies"
  on public.escalation_policies for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org admins can manage escalation policies"
  on public.escalation_policies for all to authenticated
  using (org_id = public.jwt_org_id() and public.is_org_admin())
  with check (org_id = public.jwt_org_id() and public.is_org_admin());

create policy "Org members can read webhook integrations"
  on public.webhook_integrations for select to authenticated
  using (org_id = public.jwt_org_id());

create policy "Org admins can manage webhook integrations"
  on public.webhook_integrations for all to authenticated
  using (org_id = public.jwt_org_id() and public.is_org_admin())
  with check (org_id = public.jwt_org_id() and public.is_org_admin());

create policy "Users can read their own notifications"
  on public.notifications for select to authenticated
  using (org_id = public.jwt_org_id() and user_id = auth.uid());

create policy "Users can update their own notifications"
  on public.notifications for update to authenticated
  using (org_id = public.jwt_org_id() and user_id = auth.uid())
  with check (org_id = public.jwt_org_id() and user_id = auth.uid());

create policy "Org admins can read audit log"
  on public.audit_log for select to authenticated
  using (org_id = public.jwt_org_id() and public.is_org_admin());
