"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/app/actions/organization";
import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { updateEscalationPolicySchema } from "@/schemas/escalation";

export async function updateEscalationPolicyAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session || !isOrgAdmin(session.profile.org_role)) {
    return { error: "Admin access required." };
  }

  const parsed = updateEscalationPolicySchema.safeParse({
    policyId: formData.get("policyId"),
    acknowledgeThresholdMinutes: formData.get("acknowledgeThresholdMinutes"),
    resolveThresholdMinutes: formData.get("resolveThresholdMinutes"),
    autoEscalateSeverity: formData.get("autoEscalateSeverity") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("escalation_policies")
    .update({
      acknowledge_threshold_minutes: parsed.data.acknowledgeThresholdMinutes,
      resolve_threshold_minutes: parsed.data.resolveThresholdMinutes,
      escalation_action: {
        autoEscalateSeverity: parsed.data.autoEscalateSeverity,
      },
    })
    .eq("id", parsed.data.policyId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/escalation");
  revalidatePath("/settings");
  return { success: "Escalation policy updated." };
}
