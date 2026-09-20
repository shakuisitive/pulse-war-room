import { describe, expect, it } from "vitest";

import { createTaskSchema, declareIncidentSchema } from "@/schemas/incident";
import { isValidStatusTransition } from "@/lib/incidents/status-transitions";

describe("declareIncidentSchema", () => {
  it("accepts valid incident input", () => {
    const result = declareIncidentSchema.safeParse({
      title: "API outage",
      description: "Checkout failing",
      severity: "sev1",
    });

    expect(result.success).toBe(true);
  });

  it("accepts optional metadata fields", () => {
    const result = declareIncidentSchema.safeParse({
      title: "API outage",
      severity: "sev1",
      metadata: { affected_service: "checkout" },
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = declareIncidentSchema.safeParse({
      title: "ab",
      severity: "sev2",
    });

    expect(result.success).toBe(false);
  });
});

describe("createTaskSchema", () => {
  it("accepts an optional due time", () => {
    const result = createTaskSchema.safeParse({
      incidentId: "11111111-1111-4111-8111-111111111111",
      title: "Verify rollback",
      dueAt: "2026-09-21T12:00",
    });

    expect(result.success).toBe(true);
  });
});

describe("isValidStatusTransition", () => {
  it("allows declared to investigating", () => {
    expect(isValidStatusTransition("declared", "investigating")).toBe(true);
  });

  it("blocks transitions from resolved", () => {
    expect(isValidStatusTransition("resolved", "investigating")).toBe(false);
  });
});
