import { z } from "zod";

export const aiIncidentActionSchema = z.object({
  incidentId: z.uuid(),
  action: z.enum(["summarize", "suggest-severity", "post-mortem-draft"]),
});

export const semanticSearchSchema = z.object({
  query: z.string().trim().min(2).max(500),
});
