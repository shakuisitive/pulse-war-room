import { createClient } from "@supabase/supabase-js";

import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "./load-env";
import type { Database } from "../../src/types/supabase";

export function createE2EAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createE2EUserClient() {
  return createClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

export const defaultOrgSettings = {
  requireMfa: false,
  slaThresholds: {
    sev1: { acknowledgeMinutes: 5, resolveMinutes: 60 },
    sev2: { acknowledgeMinutes: 15, resolveMinutes: 240 },
    sev3: { acknowledgeMinutes: 60, resolveMinutes: 1440 },
    sev4: { acknowledgeMinutes: 240, resolveMinutes: 10080 },
  },
};

export async function seedEscalationPolicies(orgId: string) {
  const admin = createE2EAdminClient();
  const { error } = await admin.from("escalation_policies").insert([
    {
      org_id: orgId,
      severity: "sev1",
      acknowledge_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev1.acknowledgeMinutes,
      resolve_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev1.resolveMinutes,
      escalation_action: {},
    },
    {
      org_id: orgId,
      severity: "sev2",
      acknowledge_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev2.acknowledgeMinutes,
      resolve_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev2.resolveMinutes,
      escalation_action: {},
    },
    {
      org_id: orgId,
      severity: "sev3",
      acknowledge_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev3.acknowledgeMinutes,
      resolve_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev3.resolveMinutes,
      escalation_action: {},
    },
    {
      org_id: orgId,
      severity: "sev4",
      acknowledge_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev4.acknowledgeMinutes,
      resolve_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev4.resolveMinutes,
      escalation_action: {},
    },
  ]);

  if (error) {
    throw new Error(`Failed to seed escalation policies: ${error.message}`);
  }
}
