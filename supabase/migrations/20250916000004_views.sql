-- Milestone 1: Postgres views for dashboard and analytics

create or replace view public.incident_summary_view as
select
  i.id,
  i.org_id,
  i.title,
  i.description,
  i.severity,
  i.status,
  i.declared_at,
  i.acknowledged_at,
  i.resolved_at,
  i.created_at,
  i.updated_at,
  commander.id as commander_profile_id,
  commander.display_name as commander_name,
  commander.avatar_url as commander_avatar_url,
  coalesce(task_counts.open_task_count, 0) as open_task_count,
  coalesce(task_counts.completed_task_count, 0) as completed_task_count,
  coalesce(participant_counts.participant_count, 0) as participant_count
from public.incidents i
left join public.profiles commander on commander.id = i.commander_id
left join lateral (
  select
    count(*) filter (where t.status <> 'completed') as open_task_count,
    count(*) filter (where t.status = 'completed') as completed_task_count
  from public.tasks t
  where t.incident_id = i.id
) task_counts on true
left join lateral (
  select count(*) as participant_count
  from public.incident_participants ip
  where ip.incident_id = i.id and ip.is_active = true
) participant_counts on true;

create or replace view public.analytics_base_view as
select
  i.id as incident_id,
  i.org_id,
  i.severity,
  i.status,
  i.declared_at,
  i.acknowledged_at,
  i.resolved_at,
  i.commander_id,
  commander.display_name as commander_name,
  extract(epoch from (i.acknowledged_at - i.declared_at)) / 60.0 as minutes_to_acknowledge,
  extract(epoch from (i.resolved_at - i.declared_at)) / 60.0 as minutes_to_resolve
from public.incidents i
left join public.profiles commander on commander.id = i.commander_id;

grant select on public.incident_summary_view to authenticated;
grant select on public.analytics_base_view to authenticated;
