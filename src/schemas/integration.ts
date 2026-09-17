import { z } from "zod";

import { severityLevels } from "@/schemas/incident";

export const createIntegrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  defaultSeverity: z.enum(severityLevels).default("sev3"),
  titleField: z.string().trim().max(100).optional(),
  descriptionField: z.string().trim().max(100).optional(),
  severityField: z.string().trim().max(100).optional(),
});

export const updateIntegrationSchema = z.object({
  integrationId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  defaultSeverity: z.enum(severityLevels),
  titleField: z.string().trim().max(100).optional(),
  descriptionField: z.string().trim().max(100).optional(),
  severityField: z.string().trim().max(100).optional(),
  isActive: z.boolean(),
});

export const integrationIdSchema = z.object({
  integrationId: z.uuid(),
});
