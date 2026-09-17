-- Milestone 3: Analytics RPCs and vector similarity search

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

  with filtered as (
    select *
    from public.analytics_base_view
    where org_id = v_org_id
      and declared_at >= p_start
      and declared_at <= p_end
      and (p_severity is null or severity = p_severity)
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
  )
  select jsonb_build_object(
    'mttr', coalesce((select to_jsonb(mttr.*) from mttr), '{}'::jsonb),
    'mtta', coalesce((select to_jsonb(mtta.*) from mtta), '{}'::jsonb),
    'volumeBySeverity', coalesce((select jsonb_agg(to_jsonb(volume.*)) from volume), '[]'::jsonb),
    'responderWorkload', coalesce((select jsonb_agg(to_jsonb(workload.*)) from workload), '[]'::jsonb),
    'actionItemCompletionRate', coalesce((select completion_rate from action_items), 0),
    'totalIncidents', (select count(*)::integer from filtered)
  )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_org_analytics(timestamptz, timestamptz, public.severity_level) to authenticated;

create or replace function public.search_incidents_keyword(
  p_query text,
  p_limit integer default 20
)
returns setof public.incident_summary_view
language sql
stable
security definer
set search_path = public
as $$
  select isv.*
  from public.incident_summary_view isv
  join public.incidents i on i.id = isv.id
  where isv.org_id = public.jwt_org_id()
    and i.search_vector @@ plainto_tsquery('english', p_query)
  order by ts_rank(i.search_vector, plainto_tsquery('english', p_query)) desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.search_incidents_keyword(text, integer) to authenticated;

create or replace function public.get_similar_incidents(
  p_incident_id uuid,
  p_limit integer default 5
)
returns table (
  id uuid,
  title text,
  severity public.severity_level,
  status public.incident_status,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    i.id,
    i.title,
    i.severity,
    i.status,
    1 - (i.embedding <=> source.embedding) as similarity
  from public.incidents i
  cross join (
    select embedding, org_id
    from public.incidents
    where id = p_incident_id
      and org_id = public.jwt_org_id()
  ) source
  where i.org_id = source.org_id
    and i.id <> p_incident_id
    and i.embedding is not null
    and source.embedding is not null
    and i.status = 'resolved'
  order by i.embedding <=> source.embedding
  limit greatest(p_limit, 1);
$$;

grant execute on function public.get_similar_incidents(uuid, integer) to authenticated;

create or replace function public.search_incidents_by_embedding(
  p_embedding extensions.vector(1536),
  p_limit integer default 20
)
returns table (
  id uuid,
  title text,
  severity public.severity_level,
  status public.incident_status,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    i.id,
    i.title,
    i.severity,
    i.status,
    1 - (i.embedding <=> p_embedding) as similarity
  from public.incidents i
  where i.org_id = public.jwt_org_id()
    and i.embedding is not null
  order by i.embedding <=> p_embedding
  limit greatest(p_limit, 1);
$$;

grant execute on function public.search_incidents_by_embedding(extensions.vector, integer) to authenticated;

create or replace function public.claim_embedding_jobs(p_batch_size integer default 10)
returns table (msg_id bigint, incident_id uuid, org_id uuid)
language plpgsql
security definer
set search_path = public, pgmq
as $$
declare
  job record;
begin
  for job in
    select * from pgmq.read('embedding_jobs', 120, p_batch_size)
  loop
    msg_id := job.msg_id;
    incident_id := (job.message ->> 'incident_id')::uuid;
    org_id := (job.message ->> 'org_id')::uuid;
    return next;
  end loop;
end;
$$;

create or replace function public.complete_embedding_job(p_msg_id bigint)
returns void
language plpgsql
security definer
set search_path = public, pgmq
as $$
begin
  perform pgmq.delete('embedding_jobs', p_msg_id);
end;
$$;

grant execute on function public.claim_embedding_jobs(integer) to service_role;
grant execute on function public.complete_embedding_job(bigint) to service_role;
