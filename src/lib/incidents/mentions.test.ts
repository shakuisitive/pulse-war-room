import { describe, expect, it } from "vitest";

import { findMentionedUserIds } from "@/lib/incidents/mentions";

describe("findMentionedUserIds", () => {
  const members = [
    { id: "1", display_name: "Alex Chen" },
    { id: "2", display_name: "Sam" },
  ];

  it("matches @display names", () => {
    expect(findMentionedUserIds("Need @Alex Chen on the rollback", members)).toEqual([
      "1",
    ]);
  });

  it("returns empty when nobody is mentioned", () => {
    expect(findMentionedUserIds("No mentions here", members)).toEqual([]);
  });
});
