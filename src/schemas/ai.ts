import { z } from "zod";

export const aiIncidentActionSchema = z.object({
  incidentId: z.uuid(),
  action: z.enum(["summarize", "suggest-severity", "post-mortem-draft"]),
});

export const semanticSearchSchema = z.object({
  query: z.string().trim().min(2).max(500),
});

export const suggestSeverityDraftSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(5000).optional(),
});
