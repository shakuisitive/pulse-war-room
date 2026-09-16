-- Milestone 2: On-call RPC, incident creation, and timeline auto-generation

-- ---------------------------------------------------------------------------
-- Resolve current on-call person for an org
-- ---------------------------------------------------------------------------

create or replace function public.resolve_current_on_call(p_org_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  on_call_user_id uuid;
begin
  select ocs.user_id
  into on_call_user_id
  from public.on_call_slots ocs
  inner join public.on_call_rotations ocr on ocr.id = ocs.rotation_id
  where ocr.org_id = p_org_id
    and ocr.is_active = true
    and ocs.start_time <= now()
    and ocs.end_time > now()
  order by ocs.start_time desc
  limit 1;

  return on_call_user_id;
end;
$$;

grant execute on function public.resolve_current_on_call(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Assign commander and participants when incident is declared
-- ---------------------------------------------------------------------------

create or replace function public.set_incident_commander_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.commander_id := coalesce(
    public.resolve_current_on_call(new.org_id),
    new.declared_by
  );
  return new;
end;
$$;

create trigger incidents_before_insert
  before insert on public.incidents
  for each row execute function public.set_incident_commander_before_insert();

create or replace function public.handle_incident_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commander_id uuid;
begin
  v_commander_id := new.commander_id;

  insert into public.incident_participants (
    incident_id,
    user_id,
    org_id,
    incident_role
  )
  values (new.id, v_commander_id, new.org_id, 'commander');

  if new.declared_by is not null and new.declared_by <> v_commander_id then
    insert into public.incident_participants (
      incident_id,
      user_id,
      org_id,
      incident_role
    )
    values (new.id, new.declared_by, new.org_id, 'responder');
  end if;

  insert into public.timeline_entries (
    incident_id,
    org_id,
    entry_type,
    content,
    actor_id,
    metadata
  )
  values (
    new.id,
    new.org_id,
    'incident_declared',
    coalesce(new.title, 'Incident declared'),
    new.declared_by,
    jsonb_build_object(
      'severity', new.severity,
      'status', new.status
    )
  );

  return new;
end;
$$;

create trigger incidents_after_insert
  after insert on public.incidents
  for each row execute function public.handle_incident_insert();

-- ---------------------------------------------------------------------------
-- Timeline entries on status / severity changes
-- ---------------------------------------------------------------------------

create or replace function public.set_incident_timestamps_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    if new.status = 'investigating' and new.acknowledged_at is null then
      new.acknowledged_at := now();
    end if;

    if new.status = 'resolved' and new.resolved_at is null then
      new.resolved_at := now();
    end if;
  end if;

  return new;
end;
$$;

create trigger incidents_before_update
  before update on public.incidents
  for each row execute function public.set_incident_timestamps_before_update();

create or replace function public.handle_incident_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.timeline_entries (
      incident_id,
      org_id,
      entry_type,
      content,
      actor_id,
      metadata
    )
    values (
      new.id,
      new.org_id,
      'status_changed',
      format('Status changed from %s to %s', old.status, new.status),
      auth.uid(),
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;

  if old.severity is distinct from new.severity then
    insert into public.timeline_entries (
      incident_id,
      org_id,
      entry_type,
      content,
      actor_id,
      metadata
    )
    values (
      new.id,
      new.org_id,
      'severity_changed',
      format('Severity changed from %s to %s', old.severity, new.severity),
      auth.uid(),
      jsonb_build_object('from', old.severity, 'to', new.severity)
    );
  end if;

  if old.commander_id is distinct from new.commander_id
    and old.commander_id is not null then
    insert into public.timeline_entries (
      incident_id,
      org_id,
      entry_type,
      content,
      actor_id,
      metadata
    )
    values (
      new.id,
      new.org_id,
      'commander_reassigned',
      'Incident commander reassigned',
      auth.uid(),
      jsonb_build_object(
        'from_commander_id', old.commander_id,
        'to_commander_id', new.commander_id
      )
    );
  end if;

  return new;
end;
$$;

create trigger incidents_after_update
  after update on public.incidents
  for each row execute function public.handle_incident_update();

-- ---------------------------------------------------------------------------
-- Timeline on participant join/leave
-- ---------------------------------------------------------------------------

create or replace function public.handle_participant_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.timeline_entries (
      incident_id,
      org_id,
      entry_type,
      content,
      actor_id,
      metadata
    )
    values (
      new.incident_id,
      new.org_id,
      'participant_joined',
      format('Participant joined as %s', new.incident_role),
      auth.uid(),
      jsonb_build_object(
        'user_id', new.user_id,
        'incident_role', new.incident_role
      )
    );
  elsif tg_op = 'UPDATE' and old.is_active = true and new.is_active = false then
    insert into public.timeline_entries (
      incident_id,
      org_id,
      entry_type,
      content,
      actor_id,
      metadata
    )
    values (
      new.incident_id,
      new.org_id,
      'participant_left',
      'Participant left the war room',
      auth.uid(),
      jsonb_build_object('user_id', new.user_id)
    );
  end if;

  return coalesce(new, old);
end;
$$;

create trigger incident_participants_change
  after insert or update on public.incident_participants
  for each row execute function public.handle_participant_change();

-- ---------------------------------------------------------------------------
-- Timeline on task completion
-- ---------------------------------------------------------------------------

create or replace function public.set_task_completed_at_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status = 'completed' then
    new.completed_at := now();
  end if;

  return new;
end;
$$;

create trigger tasks_before_update
  before update on public.tasks
  for each row execute function public.set_task_completed_at_before_update();

create or replace function public.handle_task_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.timeline_entries (
      incident_id,
      org_id,
      entry_type,
      content,
      actor_id,
      metadata
    )
    values (
      new.incident_id,
      new.org_id,
      'task_created',
      new.title,
      auth.uid(),
      jsonb_build_object('task_id', new.id)
    );
  elsif old.status is distinct from new.status and new.status = 'completed' then
    insert into public.timeline_entries (
      incident_id,
      org_id,
      entry_type,
      content,
      actor_id,
      metadata
    )
    values (
      new.incident_id,
      new.org_id,
      'task_completed',
      new.title,
      auth.uid(),
      jsonb_build_object('task_id', new.id)
    );
  end if;

  return new;
end;
$$;

create trigger tasks_timeline
  after insert or update on public.tasks
  for each row execute function public.handle_task_update();

-- ---------------------------------------------------------------------------
-- Timeline on evidence upload
-- ---------------------------------------------------------------------------

create or replace function public.handle_evidence_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.timeline_entries (
    incident_id,
    org_id,
    entry_type,
    content,
    actor_id,
    metadata
  )
  values (
    new.incident_id,
    new.org_id,
    'evidence_uploaded',
    coalesce(new.caption, new.file_name),
    new.uploaded_by,
    jsonb_build_object(
      'evidence_id', new.id,
      'file_name', new.file_name,
      'file_type', new.file_type
    )
  );

  return new;
end;
$$;

create trigger evidence_timeline
  after insert on public.evidence
  for each row execute function public.handle_evidence_insert();
