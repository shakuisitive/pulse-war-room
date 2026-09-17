# Pulse

Real-time incident command center built with **Next.js** and **Supabase**. Pulse provides war rooms, on-call management, AI-assisted post-mortems, webhook ingestion, analytics, and org-scoped RBAC enforced at the database layer.

## Tech stack

- Next.js 16 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- Supabase: Postgres, Auth, Realtime, Storage, Edge Functions, pg_cron, pgmq, pgvector
- TanStack Query, Zod, Recharts, Vitest

## Local development

### Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- OpenAI API key (optional — AI features degrade gracefully without it)

### Setup

```bash
npm install
cp .env.example .env
```

Fill `.env` with values from `supabase start` (local) or your Supabase project dashboard (cloud).

```bash
supabase start
supabase db reset   # applies migrations + seed.sql
npm run gen:types
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Local demo login** (after `supabase db reset`):

- Email: `demo@pulse.dev`
- Password: `password123`

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run test:run` | Run Vitest tests |
| `npm run gen:types` | Regenerate Supabase TypeScript types |

## Supabase Edge Functions

Deploy to your linked project:

```bash
supabase functions deploy webhook-ingest --no-verify-jwt
supabase functions deploy ai-proxy
supabase functions deploy process-jobs
```

Set `OPENAI_API_KEY` in **Project Settings → Edge Functions → Secrets**.

Trigger embedding/notification processing manually:

```bash
curl -X POST "$SUPABASE_URL/functions/v1/process-jobs" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

## Architecture

```text
Next.js (UI, Server Actions)
        ↓
Supabase Auth + RLS (Postgres)
        ↓
Realtime / Edge Functions / pg_cron / pgmq
```

- **Authorization:** org isolation via JWT claims (`org_id`, `org_role`) + incident-level roles in `incident_participants`
- **Real-time:** Postgres Changes for incidents, timeline, tasks, notifications; Broadcast/Presence for war room chat
- **AI:** All OpenAI calls proxied through Edge Functions; API key never sent to the browser
- **Async jobs:** pgmq queues + pg_cron; embeddings via `process-jobs` Edge Function

## Deployment

### Vercel (Next.js)

1. Import the GitHub repo
2. Set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_SITE_URL`
3. Deploy

### Supabase (backend)

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy webhook-ingest --no-verify-jwt
supabase functions deploy ai-proxy
supabase functions deploy process-jobs
```

Register the Custom Access Token Hook (`custom_access_token_hook`) in the Supabase Auth dashboard.

## Database schema

Migrations live in `supabase/migrations/`. Key domains:

- **Core:** organizations, profiles, incidents, incident_participants
- **War room:** timeline_entries, chat_messages, tasks, evidence
- **Post-incident:** post_mortems, action_items
- **Ops:** on_call_rotations, escalation_policies, webhook_integrations, notifications
- **Observability:** audit_log, analytics RPCs, pgvector embeddings

Run `supabase db reset` locally to apply all migrations from scratch.

## License

Private portfolio project.
