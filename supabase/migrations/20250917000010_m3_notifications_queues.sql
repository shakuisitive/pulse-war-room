-- Milestone 3: Notification queue (pgmq), dispatch processing, Realtime on notifications

create extension if not exists pgmq;

select pgmq.create('notification_jobs');
select pgmq.create('embedding_jobs');

-- Service-role helper: enqueue a notification job
create or replace function public.enqueue_notification_job(p_payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  return pgmq.send('notification_jobs', p_payload);
end;
$$;

revoke all on function public.enqueue_notification_job(jsonb) from public;
grant execute on function public.enqueue_notification_job(jsonb) to authenticated, service_role;

-- Process queued notification jobs (called by pg_cron or Edge Function)
create or replace function public.process_notification_jobs(p_batch_size integer default 25)
returns integer
language plpgsql
security definer
set search_path = public, pgmq
as $$
declare
  job record;
  processed integer := 0;
  payload jsonb;
begin
  for job in
    select * from pgmq.read('notification_jobs', 60, p_batch_size)
  loop
    payload := job.message;

    insert into public.notifications (
      org_id,
      user_id,
      notification_type,
      title,
      body,
      incident_id
    )
    values (
      (payload ->> 'org_id')::uuid,
      (payload ->> 'user_id')::uuid,
      (payload ->> 'notification_type')::public.notification_type,
      payload ->> 'title',
      coalesce(payload ->> 'body', ''),
      nullif(payload ->> 'incident_id', '')::uuid
    );

    perform pgmq.delete('notification_jobs', job.msg_id);
    processed := processed + 1;
  end loop;

  return processed;
end;
$$;

revoke all on function public.process_notification_jobs(integer) from public;
grant execute on function public.process_notification_jobs(integer) to service_role;

-- Notify org admins + commander + active participants for an incident event
create or replace function public.enqueue_incident_notifications(
  p_incident_id uuid,
  p_notification_type public.notification_type,
  p_title text,
  p_body text default ''
)
returns void
language plpgsql
security definer
set search_path = public, pgmq
as $$
declare
  v_org_id uuid;
  v_user_id uuid;
begin
  select org_id into v_org_id from public.incidents where id = p_incident_id;

  if v_org_id is null then
    return;
  end if;

  for v_user_id in
    select distinct uid
    from (
      select i.commander_id as uid
      from public.incidents i
      where i.id = p_incident_id and i.commander_id is not null
      union
      select p.id as uid
      from public.profiles p
      where p.org_id = v_org_id and p.org_role in ('owner', 'admin')
      union
      select ip.user_id as uid
      from public.incident_participants ip
      where ip.incident_id = p_incident_id
        and ip.is_active = true
        and ip.incident_role in ('commander', 'responder', 'observer')
    ) recipients
    where uid is not null
  loop
    perform public.enqueue_notification_job(jsonb_build_object(
      'org_id', v_org_id,
      'user_id', v_user_id,
      'notification_type', p_notification_type,
      'title', p_title,
      'body', p_body,
      'incident_id', p_incident_id
    ));
  end loop;
end;
$$;

create or replace function public.handle_incident_notification_events()
returns trigger
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  if tg_op = 'INSERT' then
    perform public.enqueue_incident_notifications(
      new.id,
      'incident_assigned',
      'New incident declared',
      new.title
    );
    perform pgmq.send('embedding_jobs', jsonb_build_object(
      'incident_id', new.id,
      'org_id', new.org_id
    ));
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.severity is distinct from old.severity then
      perform public.enqueue_incident_notifications(
        new.id,
        'escalation',
        'Incident severity changed',
        format('%s → %s', old.severity, new.severity)
      );
    end if;

    if new.status is distinct from old.status then
      perform public.enqueue_incident_notifications(
        new.id,
        'incident_assigned',
        'Incident status updated',
        format('%s → %s', old.status, new.status)
      );
    end if;

    if new.title is distinct from old.title
      or coalesce(new.description, '') is distinct from coalesce(old.description, '') then
      perform pgmq.send('embedding_jobs', jsonb_build_object(
        'incident_id', new.id,
        'org_id', new.org_id
      ));
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists incidents_notification_events on public.incidents;

create trigger incidents_notification_events
  after insert or update on public.incidents
  for each row
  execute function public.handle_incident_notification_events();

create or replace function public.handle_task_assignment_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  if new.assignee_id is not null
    and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    perform public.enqueue_notification_job(jsonb_build_object(
      'org_id', new.org_id,
      'user_id', new.assignee_id,
      'notification_type', 'task_assigned',
      'title', 'Task assigned to you',
      'body', new.title,
      'incident_id', new.incident_id
    ));
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_assignment_notification on public.tasks;

create trigger tasks_assignment_notification
  after insert or update of assignee_id on public.tasks
  for each row
  execute function public.handle_task_assignment_notification();

-- Realtime for in-app notification center
alter table public.notifications replica identity full;
alter publication supabase_realtime add table public.notifications;

-- Allow service role to insert notifications via queue processor (RLS bypass via security definer)
