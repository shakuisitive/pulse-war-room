-- Milestone 4: Post-mortem lifecycle, tighter RLS, archive RPC, Realtime

alter type public.timeline_entry_type add value if not exists 'post_mortem_published';

-- Auto-create draft post-mortem when incident is resolved
create or replace function public.ensure_post_mortem_on_resolve()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'resolved'
    and old.status is distinct from new.status then
    insert into public.post_mortems (incident_id, org_id, authored_by)
    values (new.id, new.org_id, auth.uid())
    on conflict (incident_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger incidents_ensure_post_mortem_on_resolve
  after update of status on public.incidents
  for each row execute function public.ensure_post_mortem_on_resolve();

-- Publish side effects: timestamp, timeline entry, notifications
create or replace function public.handle_post_mortem_publish()
returns trigger
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  if new.is_published = true
    and (tg_op = 'INSERT' or old.is_published is distinct from true) then
    if new.published_at is null then
      new.published_at := now();
    end if;

    insert into public.timeline_entries (
      incident_id,
      org_id,
      entry_type,
      content,
      actor_id,
      is_stakeholder_visible
    )
    values (
      new.incident_id,
      new.org_id,
      'post_mortem_published',
      'Post-mortem published',
      auth.uid(),
      new.is_stakeholder_visible
    );

    perform public.enqueue_incident_notifications(
      new.incident_id,
      'postmortem_published',
      'Post-mortem published',
      'A post-mortem is now available for review'
    );
  end if;

  return new;
end;
$$;

create trigger post_mortems_publish
  before insert or update of is_published on public.post_mortems
  for each row execute function public.handle_post_mortem_publish();

-- Commander/admin manage; org reads published drafts only for participants
drop policy if exists "Org members can manage post mortems" on public.post_mortems;
drop policy if exists "Org members can read post mortems" on public.post_mortems;

create policy "Org members can read accessible post mortems"
  on public.post_mortems for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and (
      is_published = true
      or public.is_org_admin()
      or public.is_incident_commander(incident_id)
      or public.get_incident_role(incident_id) in ('commander', 'responder')
    )
  );

create policy "Commanders and admins can manage post mortems"
  on public.post_mortems for all to authenticated
  using (
    org_id = public.jwt_org_id()
    and (public.is_org_admin() or public.is_incident_commander(incident_id))
  )
  with check (
    org_id = public.jwt_org_id()
    and (public.is_org_admin() or public.is_incident_commander(incident_id))
  );

-- Assignees can update status on their action items
drop policy if exists "Org members can manage action items" on public.action_items;

create policy "Org members can manage action items"
  on public.action_items for all to authenticated
  using (
    org_id = public.jwt_org_id()
    and (
      public.is_org_admin()
      or public.is_incident_commander(incident_id)
      or assignee_id = auth.uid()
    )
  )
  with check (
    org_id = public.jwt_org_id()
    and (
      public.is_org_admin()
      or public.is_incident_commander(incident_id)
      or assignee_id = auth.uid()
    )
  );

create or replace view public.post_mortem_archive_view as
select
  pm.id,
  pm.incident_id,
  pm.org_id,
  pm.summary,
  pm.is_published,
  pm.published_at,
  pm.is_stakeholder_visible,
  pm.created_at,
  pm.updated_at,
  i.title as incident_title,
  i.severity,
  i.status as incident_status,
  author.display_name as author_name
from public.post_mortems pm
join public.incidents i on i.id = pm.incident_id
left join public.profiles author on author.id = pm.authored_by
where pm.is_published = true;

grant select on public.post_mortem_archive_view to authenticated;

create or replace function public.get_my_action_items(
  p_include_completed boolean default false
)
returns setof public.action_items
language sql
stable
security definer
set search_path = public
as $$
  select ai.*
  from public.action_items ai
  where ai.org_id = public.jwt_org_id()
    and ai.assignee_id = auth.uid()
    and (p_include_completed or ai.status <> 'completed')
  order by
    case when ai.due_at is not null and ai.due_at < now() and ai.status <> 'completed' then 0 else 1 end,
    ai.due_at nulls last,
    ai.created_at desc;
$$;

grant execute on function public.get_my_action_items(boolean) to authenticated;

alter table public.post_mortems replica identity full;
alter table public.action_items replica identity full;

alter publication supabase_realtime add table public.post_mortems;
alter publication supabase_realtime add table public.action_items;
