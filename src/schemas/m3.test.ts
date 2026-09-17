import { describe, expect, it } from "vitest";

import { aiIncidentActionSchema, semanticSearchSchema } from "@/schemas/ai";
import { escalationPolicyFormSchema } from "@/schemas/escalation";
import { createIntegrationSchema } from "@/schemas/integration";
import { inviteStakeholderSchema } from "@/schemas/incident";

const incidentId = "550e8400-e29b-41d4-a716-446655440000";

describe("createIntegrationSchema", () => {
  it("accepts valid integration input", () => {
    const result = createIntegrationSchema.safeParse({
      name: "Datadog alerts",
      defaultSeverity: "sev2",
    });

    expect(result.success).toBe(true);
  });
});

describe("escalationPolicyFormSchema", () => {
  it("requires positive thresholds", () => {
    const result = escalationPolicyFormSchema.safeParse({
      severity: "sev1",
      acknowledgeThresholdMinutes: 0,
      resolveThresholdMinutes: 60,
    });

    expect(result.success).toBe(false);
  });
});

describe("aiIncidentActionSchema", () => {
  it("accepts supported war room AI actions", () => {
    const result = aiIncidentActionSchema.safeParse({
      incidentId,
      action: "summarize",
    });

    expect(result.success).toBe(true);
  });
});

describe("semanticSearchSchema", () => {
  it("rejects very short queries", () => {
    const result = semanticSearchSchema.safeParse({ query: "a" });
    expect(result.success).toBe(false);
  });
});

describe("inviteStakeholderSchema", () => {
  it("accepts a stakeholder email invite", () => {
    const result = inviteStakeholderSchema.safeParse({
      incidentId,
      email: "exec@example.com",
    });

    expect(result.success).toBe(true);
  });
});
