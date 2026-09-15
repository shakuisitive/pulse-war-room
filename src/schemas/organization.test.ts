import { describe, expect, it } from "vitest";

import { createOrganizationSchema } from "@/schemas/organization";

describe("createOrganizationSchema", () => {
  it("accepts valid organization input", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Acme Ops",
      slug: "acme-ops",
      displayName: "Alex Commander",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid slug format", () => {
    const result = createOrganizationSchema.safeParse({
      name: "Acme Ops",
      slug: "Acme_Ops",
      displayName: "Alex Commander",
    });

    expect(result.success).toBe(false);
  });
});
