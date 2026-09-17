-- Milestone 4: Complete audit triggers, action item timestamps, remaining pg_cron jobs

-- Audit log on remaining mutable tables
create trigger timeline_entries_audit_log
  after insert or update or delete on public.timeline_entries
  for each row execute function public.audit_log_trigger();

create trigger chat_messages_audit_log
  after insert or update or delete on public.chat_messages
  for each row execute function public.audit_log_trigger();

create trigger tasks_audit_log
  after insert or update or delete on public.tasks
  for each row execute function public.audit_log_trigger();

create trigger evidence_audit_log
  after insert or update or delete on public.evidence
  for each row execute function public.audit_log_trigger();

create trigger post_mortems_audit_log
  after insert or update or delete on public.post_mortems
  for each row execute function public.audit_log_trigger();

create trigger action_items_audit_log
  after insert or update or delete on public.action_items
  for each row execute function public.audit_log_trigger();

create trigger on_call_slots_audit_log
  after insert or update or delete on public.on_call_slots
  for each row execute function public.audit_log_trigger();

create trigger notifications_audit_log
  after insert or update or delete on public.notifications
  for each row execute function public.audit_log_trigger();

-- Auto-set completed_at when action items are marked completed
create or replace function public.set_action_item_completed_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed'
    and (old.status is distinct from new.status or old.completed_at is null) then
    new.completed_at := coalesce(new.completed_at, now());
  elsif new.status <> 'completed' then
    new.completed_at := null;
  end if;

  return new;
end;
$$;

create trigger action_items_set_completed_at
  before update on public.action_items
  for each row execute function public.set_action_item_completed_at();

-- Hourly stale incident reminders (no update in 4 hours)
create or replace function public.send_stale_incident_reminders()
returns integer
language plpgsql
security definer
set search_path = public, pgmq
as $$
declare
  rec record;
  sent integer := 0;
  v_meta jsonb;
begin
  for rec in
    select id, org_id, title, metadata
    from public.incidents
    where status <> 'resolved'
      and updated_at < now() - interval '4 hours'
  loop
    v_meta := coalesce(rec.metadata, '{}'::jsonb);

    if v_meta ->> 'stale_reminder_sent_at' is not null then
      continue;
    end if;

    perform public.enqueue_incident_notifications(
      rec.id,
      'sla_warning',
      'Stale incident reminder',
      format('%s has had no updates in over 4 hours', rec.title)
    );

    update public.incidents
    set metadata = v_meta || jsonb_build_object('stale_reminder_sent_at', now())
    where id = rec.id;

    sent := sent + 1;
  end loop;

  return sent;
end;
$$;

revoke all on function public.send_stale_incident_reminders() from public;
grant execute on function public.send_stale_incident_reminders() to service_role;

-- Presence is Realtime-only (ephemeral). Cron logs maintenance for observability.
create or replace function public.run_presence_cleanup_maintenance()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_log (org_id, actor_id, action, table_name, new_data)
  values (
    null,
    null,
    'CRON',
    'presence',
    jsonb_build_object(
      'event', 'presence_cleanup',
      'note', 'Realtime presence is ephemeral; stale channel state expires on disconnect'
    )
  );
end;
$$;

revoke all on function public.run_presence_cleanup_maintenance() from public;
grant execute on function public.run_presence_cleanup_maintenance() to service_role;

-- Weekly digest placeholder — logs summary row per org to audit_log
create or replace function public.run_weekly_incident_digest()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  processed integer := 0;
  v_open integer;
  v_resolved integer;
begin
  for rec in select id from public.organizations loop
    select count(*) filter (where status <> 'resolved'),
           count(*) filter (where status = 'resolved' and resolved_at >= now() - interval '7 days')
    into v_open, v_resolved
    from public.incidents
    where org_id = rec.id;

    insert into public.audit_log (org_id, actor_id, action, table_name, new_data)
    values (
      rec.id,
      null,
      'CRON',
      'weekly_digest',
      jsonb_build_object(
        'open_incidents', v_open,
        'resolved_last_7_days', v_resolved,
        'generated_at', now()
      )
    );

    processed := processed + 1;
  end loop;

  return processed;
end;
$$;

revoke all on function public.run_weekly_incident_digest() from public;
grant execute on function public.run_weekly_incident_digest() to service_role;

-- Filtered audit log RPC for admin UI
create or replace function public.get_audit_log(
  p_start timestamptz default (now() - interval '7 days'),
  p_end timestamptz default now(),
  p_table_name text default null,
  p_actor_id uuid default null,
  p_limit integer default 100
)
returns setof public.audit_log
language sql
stable
security definer
set search_path = public
as $$
  select al.*
  from public.audit_log al
  where al.org_id = public.jwt_org_id()
    and public.is_org_admin()
    and al.created_at >= p_start
    and al.created_at <= p_end
    and (p_table_name is null or al.table_name = p_table_name)
    and (p_actor_id is null or al.actor_id = p_actor_id)
  order by al.created_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.get_audit_log(timestamptz, timestamptz, text, uuid, integer) to authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'pulse-stale-incident-reminders';

select cron.schedule(
  'pulse-stale-incident-reminders',
  '0 * * * *',
  $$ select public.send_stale_incident_reminders(); $$
);

select cron.unschedule(jobid)
from cron.job
where jobname = 'pulse-presence-cleanup';

select cron.schedule(
  'pulse-presence-cleanup',
  '0 */6 * * *',
  $$ select public.run_presence_cleanup_maintenance(); $$
);

select cron.unschedule(jobid)
from cron.job
where jobname = 'pulse-weekly-incident-digest';

select cron.schedule(
  'pulse-weekly-incident-digest',
  '0 9 * * 1',
  $$ select public.run_weekly_incident_digest(); $$
);
