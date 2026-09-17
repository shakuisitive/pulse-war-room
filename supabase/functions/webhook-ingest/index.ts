import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

async function verifySignature(
  body: string,
  signature: string | null,
  secret: string,
) {
  if (!signature) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );

  const expected = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === signature.toLowerCase();
}

function mapPayload(
  payload: Record<string, unknown>,
  mapping: Record<string, string>,
  defaults: { title: string; description: string; severity: string },
) {
  const read = (key: string, fallback: string) => {
    const path = mapping[key];
    if (!path) {
      return fallback;
    }

    const value = payload[path];
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  };

  return {
    title: read("title", defaults.title),
    description: read("description", defaults.description),
    severity: read("severity", defaults.severity),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);
    const slug = url.pathname.split("/").pop();

    if (!slug) {
      return jsonResponse({ error: "Missing integration slug" }, 400);
    }

    const rawBody = await req.text();
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const supabase = createServiceClient();

    const { data: integration, error } = await supabase
      .from("webhook_integrations")
      .select("*")
      .eq("endpoint_slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !integration) {
      return jsonResponse({ error: "Integration not found" }, 404);
    }

    const signature = req.headers.get("x-pulse-signature");
    const isValid = await verifySignature(
      rawBody,
      signature,
      integration.signing_secret,
    );

    if (!isValid) {
      return jsonResponse({ error: "Invalid signature" }, 401);
    }

    const mapping =
      (integration.payload_mapping as Record<string, string> | null) ?? {};

    const mapped = mapPayload(payload as Record<string, unknown>, mapping, {
      title: "Webhook alert",
      description: JSON.stringify(payload).slice(0, 4000),
      severity: integration.default_severity,
    });

    const { data: incident, error: insertError } = await supabase
      .from("incidents")
      .insert({
        org_id: integration.org_id,
        title: mapped.title,
        description: mapped.description,
        severity: mapped.severity as "sev1" | "sev2" | "sev3" | "sev4",
        metadata: { source: "webhook", integration_id: integration.id },
      })
      .select("id")
      .single();

    if (insertError) {
      return jsonResponse({ error: insertError.message }, 500);
    }

    return jsonResponse({ incidentId: incident.id }, 201);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unexpected error";
    return jsonResponse({ error: message }, 500);
  }
});
