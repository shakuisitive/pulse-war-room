-- Close remaining PRODUCT.md gaps: stakeholder isolation, MFA-ready claims,
-- notification email queue, SLA auto-escalation, richer analytics, AI timeline
-- entries, chat/evidence visibility updates, and scheduled process-jobs invoke.

-- ---------------------------------------------------------------------------
-- Stakeholder-only flag + JWT claim
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_stakeholder_only boolean not null default false;

create or replace function public.is_stakeholder_only_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'is_stakeholder_only')::boolean,
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_stakeholder_only = true
    )
  );
$$;

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  user_org_id uuid;
  user_org_role text;
  user_is_stakeholder_only boolean;
begin
  claims := event -> 'claims';

  select org_id, org_role::text, is_stakeholder_only
  into user_org_id, user_org_role, user_is_stakeholder_only
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  if user_org_id is not null then
    claims := jsonb_set(claims, '{org_id}', to_jsonb(user_org_id::text));
    claims := jsonb_set(claims, '{org_role}', to_jsonb(user_org_role));
    claims := jsonb_set(
      claims,
      '{is_stakeholder_only}',
      to_jsonb(coalesce(user_is_stakeholder_only, false))
    );
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Stakeholders must not see every org incident via the member SELECT policy.
drop policy if exists "Org members can read incidents in their org" on public.incidents;
create policy "Org members can read incidents in their org"
  on public.incidents for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and not public.is_stakeholder_only_user()
  );

drop policy if exists "Org members can declare incidents" on public.incidents;
create policy "Org members can declare incidents"
  on public.incidents for insert to authenticated
  with check (
    org_id = public.jwt_org_id()
    and declared_by = auth.uid()
    and not public.is_stakeholder_only_user()
  );

drop policy if exists "Members can read profiles in their org" on public.profiles;
create policy "Members can read profiles in their org"
  on public.profiles for select to authenticated
  using (
    org_id = public.jwt_org_id()
    and (
      not public.is_stakeholder_only_user()
      or id = auth.uid()
      or exists (
        select 1
        from public.incident_participants mine
        join public.incident_participants theirs
          on theirs.incident_id = mine.incident_id
         and theirs.is_active = true
        where mine.user_id = auth.uid()
          and mine.is_active = true
          and theirs.user_id = profiles.id
      )
    )
  );

-- Commanders can mark chat / evidence as stakeholder-visible.
drop policy if exists "Commanders can update chat visibility" on public.chat_messages;
create policy "Commanders can update chat visibility"
  on public.chat_messages for update to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.can_write_incident_core(incident_id)
  )
  with check (org_id = public.jwt_org_id());

drop policy if exists "Commanders can update evidence visibility" on public.evidence;
create policy "Commanders can update evidence visibility"
  on public.evidence for update to authenticated
  using (
    org_id = public.jwt_org_id()
    and public.can_write_incident_core(incident_id)
  )
  with check (org_id = public.jwt_org_id());

-- ---------------------------------------------------------------------------
-- AI summary timeline helper
-- ---------------------------------------------------------------------------

create or replace function public.record_ai_summary(
  p_incident_id uuid,
  p_content text,
  p_is_stakeholder_visible boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_entry_id uuid;
begin
  if not (
    public.is_org_admin()
    or public.get_incident_role(p_incident_id) in ('commander', 'responder', 'observer')
  ) then
    raise exception 'Not authorized to record an AI summary';
  end if;

  select org_id into v_org_id
  from public.incidents
  where id = p_incident_id;

  if v_org_id is null or v_org_id <> public.jwt_org_id() then
    raise exception 'Incident not found';
  end if;

  insert into public.timeline_entries (
    incident_id,
    org_id,
    entry_type,
    content,
    actor_id,
    metadata,
    is_stakeholder_visible
  )
  values (
    p_incident_id,
    v_org_id,
    'ai_summary_generated',
    p_content,
    auth.uid(),
    jsonb_build_object('source', 'ai-proxy'),
    p_is_stakeholder_visible
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

grant execute on function public.record_ai_summary(uuid, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Notification preferences + email queue
-- ---------------------------------------------------------------------------

select pgmq.create('email_jobs');

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
  v_prefs jsonb;
  v_in_app boolean;
  v_email boolean;
begin
  for job in
    select * from pgmq.read('notification_jobs', 60, p_batch_size)
  loop
    payload := job.message;

    select coalesce(notification_preferences, '{}'::jsonb)
    into v_prefs
    from public.profiles
    where id = (payload ->> 'user_id')::uuid;

    v_in_app := coalesce((v_prefs ->> 'inAppEnabled')::boolean, true);
    v_email := coalesce((v_prefs ->> 'emailEnabled')::boolean, true);

    if v_in_app then
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
    end if;

    if v_email then
      perform pgmq.send('email_jobs', payload);
    end if;

    perform pgmq.delete('notification_jobs', job.msg_id);
    processed := processed + 1;
  end loop;

  return processed;
end;
$$;

create or replace function public.claim_email_jobs(p_batch_size integer default 25)
returns table(msg_id bigint, payload jsonb)
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  return query
    select job.msg_id, job.message
    from pgmq.read('email_jobs', 120, p_batch_size) as job;
end;
$$;

create or replace function public.complete_email_job(p_msg_id bigint)
returns void
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  perform pgmq.delete('email_jobs', p_msg_id);
end;
$$;

revoke all on function public.claim_email_jobs(integer) from public;
revoke all on function public.complete_email_job(bigint) from public;
grant execute on function public.claim_email_jobs(integer) to service_role;
grant execute on function public.complete_email_job(bigint) to service_role;

-- ---------------------------------------------------------------------------
-- SLA auto-escalation (raise severity toward sev1 + notify)
-- ---------------------------------------------------------------------------

create or replace function public.next_escalated_severity(p_severity public.severity_level)
returns public.severity_level
language sql
immutable
as $$
  select case p_severity
    when 'sev4' then 'sev3'::public.severity_level
    when 'sev3' then 'sev2'::public.severity_level
    when 'sev2' then 'sev1'::public.severity_level
    else 'sev1'::public.severity_level
  end;
$$;

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
  v_next public.severity_level;
  v_auto_escalate boolean;
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
      ep.resolve_threshold_minutes,
      ep.escalation_action
    from public.incidents i
    join public.escalation_policies ep
      on ep.org_id = i.org_id and ep.severity = i.severity
    where i.status <> 'resolved'
  loop
    v_meta := coalesce(rec.metadata, '{}'::jsonb);
    v_ack_threshold := rec.acknowledge_threshold_minutes;
    v_resolve_threshold := rec.resolve_threshold_minutes;
    v_auto_escalate := coalesce((rec.escalation_action ->> 'autoEscalateSeverity')::boolean, true);

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
        v_meta := v_meta || jsonb_build_object('sla_ack_breached_at', now());
      end if;
    end if;

    if rec.resolved_at is null
      and v_meta ->> 'sla_resolve_breached_at' is null then
      v_minutes_open := extract(epoch from (now() - rec.declared_at)) / 60.0;

      if v_minutes_open > v_resolve_threshold then
        v_next := public.next_escalated_severity(rec.severity);

        update public.incidents
        set
          metadata = v_meta || jsonb_build_object(
            'sla_resolve_breached_at', now(),
            'auto_escalated_to', v_next
          ),
          severity = case
            when v_auto_escalate and rec.severity is distinct from v_next then v_next
            else severity
          end
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
          case
            when v_auto_escalate and rec.severity is distinct from v_next then
              format(
                'SLA breach: not resolved within %s minutes. Severity auto-escalated %s → %s',
                v_resolve_threshold,
                rec.severity,
                v_next
              )
            else
              format('SLA breach: incident not resolved within %s minutes', v_resolve_threshold)
          end,
          jsonb_build_object(
            'breach_type', 'resolve',
            'auto_escalated', v_auto_escalate and rec.severity is distinct from v_next,
            'from', rec.severity,
            'to', v_next
          ),
          true
        );

        perform public.enqueue_incident_notifications(
          rec.id,
          'escalation',
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

-- ---------------------------------------------------------------------------
-- Analytics: SLA %, volume over time, recurring issues, task workload
-- ---------------------------------------------------------------------------

create or replace function public.get_org_analytics(
  p_start timestamptz default (now() - interval '30 days'),
  p_end timestamptz default now(),
  p_severity public.severity_level default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid := public.jwt_org_id();
  v_result jsonb;
begin
  if v_org_id is null then
    raise exception 'Missing org context';
  end if;

  if public.is_stakeholder_only_user() then
    raise exception 'Stakeholders cannot access org analytics';
  end if;

  with filtered as (
    select
      a.*,
      ep.acknowledge_threshold_minutes,
      ep.resolve_threshold_minutes
    from public.analytics_base_view a
    left join public.escalation_policies ep
      on ep.org_id = a.org_id
     and ep.severity = a.severity
    where a.org_id = v_org_id
      and a.declared_at >= p_start
      and a.declared_at <= p_end
      and (p_severity is null or a.severity = p_severity)
  ),
  mttr as (
    select
      round(avg(minutes_to_resolve)::numeric, 2) as avg_minutes,
      round(percentile_cont(0.5) within group (order by minutes_to_resolve)::numeric, 2) as p50,
      round(percentile_cont(0.9) within group (order by minutes_to_resolve)::numeric, 2) as p90,
      round(percentile_cont(0.95) within group (order by minutes_to_resolve)::numeric, 2) as p95
    from filtered
    where minutes_to_resolve is not null
  ),
  mtta as (
    select
      round(avg(minutes_to_acknowledge)::numeric, 2) as avg_minutes,
      round(percentile_cont(0.5) within group (order by minutes_to_acknowledge)::numeric, 2) as p50,
      round(percentile_cont(0.9) within group (order by minutes_to_acknowledge)::numeric, 2) as p90
    from filtered
    where minutes_to_acknowledge is not null
  ),
  volume as (
    select severity, count(*)::integer as count
    from filtered
    group by severity
  ),
  volume_over_time as (
    select
      to_char(date_trunc('day', declared_at), 'YYYY-MM-DD') as day,
      count(*)::integer as count
    from filtered
    group by 1
    order by 1
  ),
  sla as (
    select
      round(
        100.0 * count(*) filter (
          where minutes_to_acknowledge is not null
            and acknowledge_threshold_minutes is not null
            and minutes_to_acknowledge <= acknowledge_threshold_minutes
        ) / nullif(count(*) filter (where minutes_to_acknowledge is not null), 0),
        2
      ) as acknowledge_pct,
      round(
        100.0 * count(*) filter (
          where minutes_to_resolve is not null
            and resolve_threshold_minutes is not null
            and minutes_to_resolve <= resolve_threshold_minutes
        ) / nullif(count(*) filter (where minutes_to_resolve is not null), 0),
        2
      ) as resolve_pct
    from filtered
  ),
  workload as (
    select
      commander_id as user_id,
      commander_name as display_name,
      count(*)::integer as incidents_commanded
    from filtered
    where commander_id is not null
    group by commander_id, commander_name
    order by incidents_commanded desc
    limit 10
  ),
  task_workload as (
    select
      t.assignee_id as user_id,
      p.display_name,
      count(*) filter (where t.status = 'completed')::integer as tasks_completed
    from public.tasks t
    join public.profiles p on p.id = t.assignee_id
    where t.org_id = v_org_id
      and t.created_at >= p_start
      and t.created_at <= p_end
      and t.assignee_id is not null
    group by t.assignee_id, p.display_name
    order by tasks_completed desc
    limit 10
  ),
  action_items as (
    select
      round(
        100.0 * count(*) filter (where ai.status = 'completed')
        / nullif(count(*), 0),
        2
      ) as completion_rate
    from public.action_items ai
    where ai.org_id = v_org_id
      and ai.created_at >= p_start
      and ai.created_at <= p_end
  ),
  recurring as (
    select
      i1.id,
      i1.title,
      i2.id as similar_id,
      i2.title as similar_title,
      round((1 - (i1.embedding <=> i2.embedding))::numeric, 3) as similarity
    from public.incidents i1
    join public.incidents i2
      on i2.org_id = i1.org_id
     and i2.id > i1.id
     and i2.status = 'resolved'
     and i2.embedding is not null
    where i1.org_id = v_org_id
      and i1.status = 'resolved'
      and i1.embedding is not null
      and (1 - (i1.embedding <=> i2.embedding)) >= 0.82
    order by similarity desc
    limit 8
  )
  select jsonb_build_object(
    'mttr', coalesce((select to_jsonb(mttr.*) from mttr), '{}'::jsonb),
    'mtta', coalesce((select to_jsonb(mtta.*) from mtta), '{}'::jsonb),
    'volumeBySeverity', coalesce((select jsonb_agg(to_jsonb(volume.*)) from volume), '[]'::jsonb),
    'volumeOverTime', coalesce((select jsonb_agg(to_jsonb(volume_over_time.*)) from volume_over_time), '[]'::jsonb),
    'slaCompliance', coalesce((select to_jsonb(sla.*) from sla), '{}'::jsonb),
    'responderWorkload', coalesce((select jsonb_agg(to_jsonb(workload.*)) from workload), '[]'::jsonb),
    'taskWorkload', coalesce((select jsonb_agg(to_jsonb(task_workload.*)) from task_workload), '[]'::jsonb),
    'recurringIssues', coalesce((select jsonb_agg(to_jsonb(recurring.*)) from recurring), '[]'::jsonb),
    'actionItemCompletionRate', coalesce((select completion_rate from action_items), 0),
    'totalIncidents', (select count(*)::integer from filtered)
  )
  into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Optional scheduled invoke of process-jobs (embeddings + email)
-- Set app.settings.supabase_url and app.settings.service_role_key, or Vault
-- secrets named project_url / service_role_key.
-- ---------------------------------------------------------------------------

create extension if not exists pg_net with schema extensions;

create or replace function public.invoke_process_jobs()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_url text;
  v_key text;
begin
  v_url := nullif(current_setting('app.settings.supabase_url', true), '');
  v_key := nullif(current_setting('app.settings.service_role_key', true), '');

  begin
    if v_url is null then
      select ds.decrypted_secret into v_url
      from vault.decrypted_secrets ds
      where ds.name = 'project_url'
      limit 1;
    end if;

    if v_key is null then
      select ds.decrypted_secret into v_key
      from vault.decrypted_secrets ds
      where ds.name = 'service_role_key'
      limit 1;
    end if;
  exception
    when undefined_table then
      null;
    when undefined_object then
      null;
  end;

  if v_url is null or v_key is null then
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/process-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.invoke_process_jobs() from public;
grant execute on function public.invoke_process_jobs() to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'pulse-process-jobs';

select cron.schedule(
  'pulse-process-jobs',
  '* * * * *',
  $$ select public.invoke_process_jobs(); $$
);
