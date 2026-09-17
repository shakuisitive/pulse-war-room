import { z } from "zod";

export const actionItemStatuses = ["open", "in_progress", "completed"] as const;

export const createActionItemSchema = z.object({
  postMortemId: z.uuid(),
  incidentId: z.uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  assigneeId: z.uuid().optional().or(z.literal("")),
  dueAt: z.string().trim().optional(),
});

export const updateActionItemStatusSchema = z.object({
  actionItemId: z.uuid(),
  status: z.enum(actionItemStatuses),
});

export const deleteActionItemSchema = z.object({
  actionItemId: z.uuid(),
});
