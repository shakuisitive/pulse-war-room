"use server";

import type { ActionState } from "@/app/actions/organization";
import { getSessionContext } from "@/lib/auth/session";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import { createClient } from "@/lib/supabase/server";
import {
  aiIncidentActionSchema,
  semanticSearchSchema,
  suggestSeverityDraftSchema,
} from "@/schemas/ai";

async function getAccessToken() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function runAiIncidentAction(
  incidentId: string,
  action: "summarize" | "suggest-severity" | "post-mortem-draft",
): Promise<ActionState & { result?: string }> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = aiIncidentActionSchema.safeParse({ incidentId, action });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { error: "Missing auth session." };
  }

  const { data, error, status } = await invokeEdgeFunction<{
    summary?: string;
    draft?: string;
    result?: string;
  }>("ai-proxy", accessToken, {
    action: parsed.data.action,
    incidentId: parsed.data.incidentId,
  });

  if (error) {
    return {
      error:
        status === 503
          ? "AI is unavailable until OPENAI_API_KEY is configured in Supabase Edge Functions."
          : error,
    };
  }

  const result = data?.summary ?? data?.draft ?? data?.result ?? "";

  if (parsed.data.action === "summarize" && result) {
    const supabase = await createClient();
    await supabase.rpc("record_ai_summary", {
      p_incident_id: parsed.data.incidentId,
      p_content: result,
      p_is_stakeholder_visible: false,
    });
  }

  return { success: "AI response generated.", result };
}

export async function shareAiSummaryAction(
  incidentId: string,
  content: string,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_ai_summary", {
    p_incident_id: incidentId,
    p_content: content,
    p_is_stakeholder_visible: true,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Summary shared with stakeholders." };
}

export async function suggestSeverityDraftAction(
  title: string,
  description: string,
): Promise<ActionState & { result?: string }> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = suggestSeverityDraftSchema.safeParse({ title, description });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { error: "Missing auth session." };
  }

  const { data, error, status } = await invokeEdgeFunction<{ result?: string }>(
    "ai-proxy",
    accessToken,
    {
      action: "suggest-severity-draft",
      title: parsed.data.title,
      description: parsed.data.description ?? "",
    },
  );

  if (error) {
    return {
      error:
        status === 503
          ? "AI is unavailable until OPENAI_API_KEY is configured in Supabase Edge Functions."
          : error,
    };
  }

  return { success: "Severity suggestion ready.", result: data?.result ?? "" };
}

export async function semanticSearchAction(query: string): Promise<
  ActionState & {
    results?: Array<{
      id: string;
      title: string;
      severity: string;
      status: string;
      similarity: number;
    }>;
  }
> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = semanticSearchSchema.safeParse({ query });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { error: "Missing auth session." };
  }

  const { data, error, status } = await invokeEdgeFunction<{
    results: Array<{
      id: string;
      title: string;
      severity: string;
      status: string;
      similarity: number;
    }>;
  }>("ai-proxy", accessToken, {
    action: "semantic-search",
    query: parsed.data.query,
  });

  if (error) {
    return {
      error:
        status === 503
          ? "Semantic search requires OPENAI_API_KEY in Supabase Edge Functions."
          : error,
    };
  }

  return { success: "Search completed.", results: data?.results ?? [] };
}
