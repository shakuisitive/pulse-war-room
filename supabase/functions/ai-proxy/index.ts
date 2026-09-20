import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { hasOpenAiKey, openAiChat, openAiEmbedding } from "../_shared/openai.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";

type AiAction =
  | "summarize"
  | "suggest-severity"
  | "suggest-severity-draft"
  | "post-mortem-draft"
  | "embed-query"
  | "semantic-search";

async function loadIncidentContext(supabase: ReturnType<typeof createServiceClient>, incidentId: string) {
  const [incidentResult, timelineResult, chatResult, tasksResult] = await Promise.all([
    supabase.from("incidents").select("*").eq("id", incidentId).single(),
    supabase
      .from("timeline_entries")
      .select("entry_type, content, created_at")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("chat_messages")
      .select("content, created_at")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("tasks")
      .select("title, status, description")
      .eq("incident_id", incidentId)
      .limit(50),
  ]);

  if (incidentResult.error || !incidentResult.data) {
    throw new Error("Incident not found.");
  }

  return {
    incident: incidentResult.data,
    timeline: timelineResult.data ?? [],
    chat: chatResult.data ?? [],
    tasks: tasksResult.data ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!hasOpenAiKey()) {
    return jsonResponse({ error: "OPENAI_API_KEY is not configured." }, 503);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const userClient = createUserClient(authHeader);
    const {
      data: { user },
    } = await userClient.auth.getUser();

    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const action = body.action as AiAction;
    const incidentId = body.incidentId as string | undefined;
    const query = body.query as string | undefined;

    const supabase = createServiceClient();

    if (action === "embed-query") {
      if (!query?.trim()) {
        return jsonResponse({ error: "Query is required." }, 400);
      }

      const embedding = await openAiEmbedding(query.trim());
      return jsonResponse({ embedding });
    }

    if (action === "semantic-search") {
      if (!query?.trim()) {
        return jsonResponse({ error: "Query is required." }, 400);
      }

      const embedding = await openAiEmbedding(query.trim());
      const { data, error } = await userClient.rpc("search_incidents_by_embedding", {
        p_embedding: embedding,
        p_limit: 20,
      });

      if (error) {
        return jsonResponse({ error: error.message }, 500);
      }

      return jsonResponse({ results: data ?? [] });
    }

    if (action === "suggest-severity-draft") {
      const title = typeof body.title === "string" ? body.title : "";
      const description = typeof body.description === "string" ? body.description : "";

      if (title.trim().length < 3) {
        return jsonResponse({ error: "Title is required." }, 400);
      }

      const content = await openAiChat([
        {
          role: "system",
          content:
            "You suggest incident severity (sev1-sev4). Reply with JSON: {\"severity\":\"sev1|sev2|sev3|sev4\",\"reason\":\"...\"}",
        },
        {
          role: "user",
          content: `Title: ${title}\nDescription: ${description}`,
        },
      ]);

      return jsonResponse({ result: content });
    }

    if (!incidentId) {
      return jsonResponse({ error: "incidentId is required." }, 400);
    }

    const context = await loadIncidentContext(supabase, incidentId);

    if (action === "suggest-severity") {
      const content = await openAiChat([
        {
          role: "system",
          content:
            "You suggest incident severity (sev1-sev4). Reply with JSON: {\"severity\":\"sev1|sev2|sev3|sev4\",\"reason\":\"...\"}",
        },
        {
          role: "user",
          content: `Title: ${context.incident.title}\nDescription: ${context.incident.description ?? ""}`,
        },
      ]);

      return jsonResponse({ result: content });
    }

    if (action === "summarize") {
      const content = await openAiChat([
        {
          role: "system",
          content:
            "Summarize the incident for a responder joining late. Be concise: current status, key events, active work.",
        },
        {
          role: "user",
          content: JSON.stringify({
            incident: {
              title: context.incident.title,
              status: context.incident.status,
              severity: context.incident.severity,
            },
            timeline: context.timeline.slice(-20),
            chat: context.chat.slice(-30),
            tasks: context.tasks,
          }),
        },
      ]);

      return jsonResponse({ summary: content });
    }

    if (action === "post-mortem-draft") {
      const content = await openAiChat([
        {
          role: "system",
          content:
            "Draft a post-mortem with sections: Executive Summary, Detailed Timeline, Root Cause Analysis, Contributing Factors, Action Items.",
        },
        {
          role: "user",
          content: JSON.stringify(context),
        },
      ]);

      return jsonResponse({ draft: content });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
