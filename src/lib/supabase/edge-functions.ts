import "server-only";

import { getSupabaseUrl } from "@/lib/env";

export async function invokeEdgeFunction<T>(
  functionName: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<{ data?: T; error?: string; status: number }> {
  const response = await fetch(`${getSupabaseUrl()}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      error:
        typeof payload.error === "string"
          ? payload.error
          : "Edge Function request failed.",
      status: response.status,
    };
  }

  return { data: payload as T, status: response.status };
}
