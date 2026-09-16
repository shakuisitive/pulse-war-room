import { describe, expect, it } from "vitest";

import { declareIncidentSchema } from "@/schemas/incident";
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

  it("rejects empty title", () => {
    const result = declareIncidentSchema.safeParse({
      title: "ab",
      severity: "sev2",
    });

    expect(result.success).toBe(false);
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
