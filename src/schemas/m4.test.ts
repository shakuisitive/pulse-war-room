import { describe, expect, it } from "vitest";

import { parsePostMortemDraft } from "@/lib/post-mortem/parse-ai-draft";
import { createActionItemSchema, updateActionItemStatusSchema } from "@/schemas/action-item";
import { postMortemSectionSchema, publishPostMortemSchema } from "@/schemas/post-mortem";

const postMortemId = "550e8400-e29b-41d4-a716-446655440000";
const incidentId = "660e8400-e29b-41d4-a716-446655440001";

describe("parsePostMortemDraft", () => {
  it("maps markdown sections into structured fields", () => {
    const parsed = parsePostMortemDraft(`## Executive Summary
Payment API degraded for 22 minutes.

## Root Cause Analysis
Connection pool exhaustion.`);

    expect(parsed.summary).toContain("Payment API degraded");
    expect(parsed.rootCause).toContain("Connection pool exhaustion");
  });
});

describe("postMortemSectionSchema", () => {
  it("accepts structured post-mortem content", () => {
    const result = postMortemSectionSchema.safeParse({
      postMortemId,
      summary: "Summary",
      timelineNarrative: "Timeline",
      rootCause: "Root cause",
      contributingFactors: "Factors",
      lessonsLearned: "Lessons",
    });

    expect(result.success).toBe(true);
  });
});

describe("publishPostMortemSchema", () => {
  it("accepts publish options", () => {
    const result = publishPostMortemSchema.safeParse({
      postMortemId,
      isStakeholderVisible: true,
    });

    expect(result.success).toBe(true);
  });
});

describe("createActionItemSchema", () => {
  it("accepts action item input", () => {
    const result = createActionItemSchema.safeParse({
      postMortemId,
      incidentId,
      title: "Add pool metrics dashboard",
    });

    expect(result.success).toBe(true);
  });
});

describe("updateActionItemStatusSchema", () => {
  it("accepts valid status transitions", () => {
    const result = updateActionItemStatusSchema.safeParse({
      actionItemId: postMortemId,
      status: "completed",
    });

    expect(result.success).toBe(true);
  });
});
