-- Milestone 1: Database functions, triggers, and Custom Access Token Hook

-- ---------------------------------------------------------------------------
-- JWT helpers for RLS policies
-- ---------------------------------------------------------------------------

create or replace function public.jwt_org_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'org_id', '')::uuid;
$$;

create or replace function public.jwt_org_role()
returns public.org_role
language sql
stable
as $$
  select (auth.jwt() ->> 'org_role')::public.org_role;
$$;

create or replace function public.is_org_admin()
returns boolean
language sql
stable
as $$
  select public.jwt_org_role() in ('owner', 'admin');
$$;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger incidents_set_updated_at
  before update on public.incidents
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger post_mortems_set_updated_at
  before update on public.post_mortems
  for each row execute function public.set_updated_at();

create trigger action_items_set_updated_at
  before update on public.action_items
  for each row execute function public.set_updated_at();

create trigger on_call_rotations_set_updated_at
  before update on public.on_call_rotations
  for each row execute function public.set_updated_at();

create trigger escalation_policies_set_updated_at
  before update on public.escalation_policies
  for each row execute function public.set_updated_at();

create trigger webhook_integrations_set_updated_at
  before update on public.webhook_integrations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Full-text search vector maintenance on incidents
-- ---------------------------------------------------------------------------

create or replace function public.incidents_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B');
  return new;
end;
$$;

create trigger incidents_search_vector_update
  before insert or update of title, description on public.incidents
  for each row execute function public.incidents_search_vector_update();

-- ---------------------------------------------------------------------------
-- Audit log trigger (all mutable tables except audit_log itself)
-- ---------------------------------------------------------------------------

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
    (to_jsonb(old) ->> 'org_id')::uuid
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

create trigger organizations_audit_log
  after insert or update or delete on public.organizations
  for each row execute function public.audit_log_trigger();

create trigger profiles_audit_log
  after insert or update or delete on public.profiles
  for each row execute function public.audit_log_trigger();

create trigger incidents_audit_log
  after insert or update or delete on public.incidents
  for each row execute function public.audit_log_trigger();

create trigger incident_participants_audit_log
  after insert or update or delete on public.incident_participants
  for each row execute function public.audit_log_trigger();

create trigger escalation_policies_audit_log
  after insert or update or delete on public.escalation_policies
  for each row execute function public.audit_log_trigger();

create trigger webhook_integrations_audit_log
  after insert or update or delete on public.webhook_integrations
  for each row execute function public.audit_log_trigger();

create trigger on_call_rotations_audit_log
  after insert or update or delete on public.on_call_rotations
  for each row execute function public.audit_log_trigger();

-- ---------------------------------------------------------------------------
-- Custom Access Token Hook — inject org_id and org_role into JWT claims
-- Register in Supabase Dashboard → Authentication → Hooks → Custom Access Token
-- ---------------------------------------------------------------------------

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
begin
  claims := event -> 'claims';

  select org_id, org_role::text
  into user_org_id, user_org_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  if user_org_id is not null then
    claims := jsonb_set(claims, '{org_id}', to_jsonb(user_org_id::text));
    claims := jsonb_set(claims, '{org_role}', to_jsonb(user_org_role));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;

grant execute
  on function public.custom_access_token_hook(jsonb)
  to supabase_auth_admin;

revoke execute
  on function public.custom_access_token_hook(jsonb)
  from authenticated, anon, public;

grant select on table public.profiles to supabase_auth_admin;

create policy "Auth admin can read profiles for token hook"
  on public.profiles
  for select
  to supabase_auth_admin
  using (true);

-- ---------------------------------------------------------------------------
-- Org creation RPC (atomic org + owner profile)
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_with_owner(
  org_name text,
  org_slug text,
  owner_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  caller_id uuid;
begin
  caller_id := auth.uid();

  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = caller_id) then
    raise exception 'User already belongs to an organization';
  end if;

  insert into public.organizations (name, slug)
  values (org_name, org_slug)
  returning id into new_org_id;

  insert into public.profiles (id, org_id, org_role, display_name)
  values (caller_id, new_org_id, 'owner', owner_display_name);

  return new_org_id;
end;
$$;

grant execute on function public.create_organization_with_owner(text, text, text)
  to authenticated;
