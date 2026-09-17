"use server";

import type { ActionState } from "@/app/actions/organization";
import { getSessionContext } from "@/lib/auth/session";
import { invokeEdgeFunction } from "@/lib/supabase/edge-functions";
import { createClient } from "@/lib/supabase/server";
import { aiIncidentActionSchema, semanticSearchSchema } from "@/schemas/ai";

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

  return { success: "AI response generated.", result };
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
