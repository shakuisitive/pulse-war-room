-- Milestone 2: Realtime publications and evidence storage bucket

-- Realtime requires REPLICA IDENTITY FULL for filtered postgres_changes
alter table public.incidents replica identity full;
alter table public.incident_participants replica identity full;
alter table public.timeline_entries replica identity full;
alter table public.chat_messages replica identity full;
alter table public.tasks replica identity full;
alter table public.evidence replica identity full;

-- Add tables to Supabase Realtime publication
alter publication supabase_realtime add table public.incidents;
alter publication supabase_realtime add table public.timeline_entries;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.evidence;
alter publication supabase_realtime add table public.incident_participants;

-- Private evidence bucket: {org_id}/{incident_id}/{filename}
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do nothing;

-- Storage policies: org-scoped path, participant-based access
create policy "War room participants can read evidence files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = public.jwt_org_id()::text
    and public.can_read_full_war_room(((storage.foldername(name))[2])::uuid)
  );

create policy "Commanders and responders can upload evidence files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = public.jwt_org_id()::text
    and public.can_manage_tasks(((storage.foldername(name))[2])::uuid)
  );

create policy "Commanders and responders can delete evidence files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = public.jwt_org_id()::text
    and public.can_manage_tasks(((storage.foldername(name))[2])::uuid)
  );
