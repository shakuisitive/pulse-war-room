-- Backfill stakeholder-only accounts created before the isolation flag existed.

update public.profiles p
set is_stakeholder_only = true
where p.org_role = 'member'
  and p.is_stakeholder_only = false
  and exists (
    select 1
    from public.incident_participants ip
    where ip.user_id = p.id
      and ip.is_active = true
      and ip.incident_role = 'stakeholder'
  )
  and not exists (
    select 1
    from public.incident_participants ip
    where ip.user_id = p.id
      and ip.is_active = true
      and ip.incident_role <> 'stakeholder'
  );
