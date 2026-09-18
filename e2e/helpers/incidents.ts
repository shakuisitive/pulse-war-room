import type { Page } from "@playwright/test";

import { createE2EAdminClient } from "./supabase-admin";
import type { E2ECredentials } from "../global-setup";

export async function createIncidentViaAdmin(
  credentials: E2ECredentials,
  title: string,
  description: string,
) {
  const admin = createE2EAdminClient();

  const { data: incident, error } = await admin
    .from("incidents")
    .insert({
      org_id: credentials.orgId,
      title,
      description,
      severity: "sev2",
      declared_by: credentials.userId,
    })
    .select("id")
    .single();

  if (error || !incident) {
    throw new Error(error?.message ?? "Failed to create incident");
  }

  return incident.id;
}

export async function updateIncidentStatusViaAdmin(
  incidentId: string,
  status: "investigating" | "identified" | "monitoring" | "resolved",
) {
  const admin = createE2EAdminClient();
  const { error } = await admin
    .from("incidents")
    .update({ status })
    .eq("id", incidentId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function openDeclareIncidentDialog(page: Page) {
  const trigger = page.locator('[data-slot="dialog-trigger"]').filter({
    hasText: "Declare incident",
  });
  await trigger.click();
  await page.getByLabel("Title").waitFor({ state: "visible", timeout: 15_000 });
}
