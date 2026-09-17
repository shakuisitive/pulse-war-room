-- Milestone 3: SLA breach detection via pg_cron and escalation timeline entries

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.check_sla_breaches()
returns integer
language plpgsql
security definer
set search_path = public, pgmq
as $$
declare
  rec record;
  breached integer := 0;
  v_minutes_open numeric;
  v_ack_threshold integer;
  v_resolve_threshold integer;
  v_meta jsonb;
begin
  for rec in
    select
      i.id,
      i.org_id,
      i.title,
      i.severity,
      i.status,
      i.declared_at,
      i.acknowledged_at,
      i.resolved_at,
      i.metadata,
      ep.acknowledge_threshold_minutes,
      ep.resolve_threshold_minutes
    from public.incidents i
    join public.escalation_policies ep
      on ep.org_id = i.org_id and ep.severity = i.severity
    where i.status <> 'resolved'
  loop
    v_meta := coalesce(rec.metadata, '{}'::jsonb);
    v_ack_threshold := rec.acknowledge_threshold_minutes;
    v_resolve_threshold := rec.resolve_threshold_minutes;

    if rec.status = 'declared'
      and rec.acknowledged_at is null
      and v_meta ->> 'sla_ack_breached_at' is null then
      v_minutes_open := extract(epoch from (now() - rec.declared_at)) / 60.0;

      if v_minutes_open > v_ack_threshold then
        update public.incidents
        set metadata = v_meta || jsonb_build_object('sla_ack_breached_at', now())
        where id = rec.id;

        insert into public.timeline_entries (
          incident_id,
          org_id,
          entry_type,
          content,
          metadata,
          is_stakeholder_visible
        )
        values (
          rec.id,
          rec.org_id,
          'escalation_triggered',
          format('SLA breach: incident not acknowledged within %s minutes', v_ack_threshold),
          jsonb_build_object('breach_type', 'acknowledge'),
          true
        );

        perform public.enqueue_incident_notifications(
          rec.id,
          'sla_warning',
          'SLA acknowledgement breach',
          rec.title
        );

        breached := breached + 1;
      end if;
    end if;

    if rec.resolved_at is null
      and v_meta ->> 'sla_resolve_breached_at' is null then
      v_minutes_open := extract(epoch from (now() - rec.declared_at)) / 60.0;

      if v_minutes_open > v_resolve_threshold then
        update public.incidents
        set metadata = v_meta || jsonb_build_object('sla_resolve_breached_at', now())
        where id = rec.id;

        insert into public.timeline_entries (
          incident_id,
          org_id,
          entry_type,
          content,
          metadata,
          is_stakeholder_visible
        )
        values (
          rec.id,
          rec.org_id,
          'escalation_triggered',
          format('SLA breach: incident not resolved within %s minutes', v_resolve_threshold),
          jsonb_build_object('breach_type', 'resolve'),
          true
        );

        perform public.enqueue_incident_notifications(
          rec.id,
          'sla_warning',
          'SLA resolution breach',
          rec.title
        );

        breached := breached + 1;
      end if;
    end if;
  end loop;

  perform public.process_notification_jobs(50);

  return breached;
end;
$$;

revoke all on function public.check_sla_breaches() from public;
grant execute on function public.check_sla_breaches() to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'pulse-check-sla-breaches';

select cron.schedule(
  'pulse-check-sla-breaches',
  '* * * * *',
  $$ select public.check_sla_breaches(); $$
);

select cron.unschedule(jobid)
from cron.job
where jobname = 'pulse-process-notifications';

select cron.schedule(
  'pulse-process-notifications',
  '* * * * *',
  $$ select public.process_notification_jobs(50); $$
);
