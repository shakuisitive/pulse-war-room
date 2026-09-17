import { z } from "zod";

import { severityLevels } from "@/schemas/incident";

export const updateEscalationPolicySchema = z.object({
  policyId: z.uuid(),
  acknowledgeThresholdMinutes: z.coerce.number().int().positive(),
  resolveThresholdMinutes: z.coerce.number().int().positive(),
});

export const escalationPolicyFormSchema = z.object({
  severity: z.enum(severityLevels),
  acknowledgeThresholdMinutes: z.coerce.number().int().positive(),
  resolveThresholdMinutes: z.coerce.number().int().positive(),
});
