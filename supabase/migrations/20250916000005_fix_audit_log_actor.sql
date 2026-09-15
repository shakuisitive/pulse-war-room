-- Fix audit_log during org onboarding: actor_id must reference auth.users, not profiles.
-- When create_organization_with_owner inserts organizations, the profile row does not exist yet.

alter table public.audit_log
  drop constraint if exists audit_log_actor_id_fkey;

alter table public.audit_log
  add constraint audit_log_actor_id_fkey
  foreign key (actor_id) references auth.users (id) on delete set null;

create or replace function public.audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_uuid uuid;
  org_uuid uuid;
begin
  record_uuid := coalesce(
    (to_jsonb(new) ->> 'id')::uuid,
    (to_jsonb(old) ->> 'id')::uuid,
    (to_jsonb(new) ->> 'user_id')::uuid,
    (to_jsonb(old) ->> 'user_id')::uuid
  );

  org_uuid := coalesce(
    (to_jsonb(new) ->> 'org_id')::uuid,
    (to_jsonb(old) ->> 'org_id')::uuid,
    case
      when tg_table_name = 'organizations' then
        coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid)
      else null
    end
  );

  insert into public.audit_log (
    org_id,
    actor_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  )
  values (
    org_uuid,
    auth.uid(),
    tg_op,
    tg_table_name,
    record_uuid,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;
