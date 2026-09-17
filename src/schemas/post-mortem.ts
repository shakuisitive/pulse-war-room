import { z } from "zod";

export const postMortemSectionSchema = z.object({
  postMortemId: z.uuid(),
  summary: z.string().trim().max(10000),
  timelineNarrative: z.string().trim().max(20000),
  rootCause: z.string().trim().max(10000),
  contributingFactors: z.string().trim().max(10000),
  lessonsLearned: z.string().trim().max(10000),
});

export const publishPostMortemSchema = z.object({
  postMortemId: z.uuid(),
  isStakeholderVisible: z.boolean().default(false),
});

export const postMortemIncidentSchema = z.object({
  incidentId: z.uuid(),
});

export const applyAiDraftSchema = z.object({
  postMortemId: z.uuid(),
  draft: z.string().trim().min(1).max(50000),
});
