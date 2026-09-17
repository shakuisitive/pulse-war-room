"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/app/actions/organization";
import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { getWebhookUrl } from "@/lib/integrations/webhook-url";
import { createClient } from "@/lib/supabase/server";
import {
  createIntegrationSchema,
  integrationIdSchema,
  updateIntegrationSchema,
} from "@/schemas/integration";

function buildPayloadMapping(fields: {
  titleField?: string;
  descriptionField?: string;
  severityField?: string;
}) {
  const mapping: Record<string, string> = {};
  if (fields.titleField) mapping.title = fields.titleField;
  if (fields.descriptionField) mapping.description = fields.descriptionField;
  if (fields.severityField) mapping.severity = fields.severityField;
  return mapping;
}

function generateSlug() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function generateSigningSecret() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function createIntegrationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session || !isOrgAdmin(session.profile.org_role)) {
    return { error: "Admin access required." };
  }

  const parsed = createIntegrationSchema.safeParse({
    name: formData.get("name"),
    defaultSeverity: formData.get("defaultSeverity") ?? "sev3",
    titleField: formData.get("titleField")?.toString() || undefined,
    descriptionField: formData.get("descriptionField")?.toString() || undefined,
    severityField: formData.get("severityField")?.toString() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const slug = generateSlug();
  const secret = generateSigningSecret();

  const { error } = await supabase.from("webhook_integrations").insert({
    org_id: session.organization.id,
    name: parsed.data.name,
    endpoint_slug: slug,
    signing_secret: secret,
    default_severity: parsed.data.defaultSeverity,
    payload_mapping: buildPayloadMapping(parsed.data),
    is_active: true,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/integrations");
  return { success: "Integration created." };
}

export async function updateIntegrationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session || !isOrgAdmin(session.profile.org_role)) {
    return { error: "Admin access required." };
  }

  const parsed = updateIntegrationSchema.safeParse({
    integrationId: formData.get("integrationId"),
    name: formData.get("name"),
    defaultSeverity: formData.get("defaultSeverity"),
    titleField: formData.get("titleField")?.toString() || undefined,
    descriptionField: formData.get("descriptionField")?.toString() || undefined,
    severityField: formData.get("severityField")?.toString() || undefined,
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("webhook_integrations")
    .update({
      name: parsed.data.name,
      default_severity: parsed.data.defaultSeverity,
      payload_mapping: buildPayloadMapping(parsed.data),
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.integrationId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/integrations");
  return { success: "Integration updated." };
}

export async function deleteIntegrationAction(integrationId: string): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session || !isOrgAdmin(session.profile.org_role)) {
    return { error: "Admin access required." };
  }

  const parsed = integrationIdSchema.safeParse({ integrationId });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("webhook_integrations")
    .delete()
    .eq("id", parsed.data.integrationId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/integrations");
  return { success: "Integration deleted." };
}

export async function testIntegrationAction(integrationId: string): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session || !isOrgAdmin(session.profile.org_role)) {
    return { error: "Admin access required." };
  }

  const supabase = await createClient();
  const { data: integration, error } = await supabase
    .from("webhook_integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("org_id", session.organization.id)
    .maybeSingle();

  if (error || !integration) {
    return { error: "Integration not found." };
  }

  const payload = JSON.stringify({
    title: "Pulse webhook test",
    description: "Test alert from Pulse integrations UI",
    severity: integration.default_severity,
  });

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(integration.signing_secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  const signature = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const response = await fetch(getWebhookUrl(integration.endpoint_slug), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-pulse-signature": signature,
    },
    body: payload,
  });

  if (!response.ok) {
    const body = await response.text();
    return { error: body || "Webhook test failed." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/integrations");
  return { success: "Test webhook accepted. Check the dashboard for the new incident." };
}
