import { z } from "zod";

export const severityLevels = ["sev1", "sev2", "sev3", "sev4"] as const;
export const incidentStatuses = [
  "declared",
  "investigating",
  "identified",
  "monitoring",
  "resolved",
] as const;
export const incidentRoles = [
  "commander",
  "responder",
  "observer",
] as const;
export const taskStatuses = ["pending", "in_progress", "completed"] as const;

export const declareIncidentSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().trim().max(5000).optional(),
  severity: z.enum(severityLevels),
});

export const updateIncidentStatusSchema = z.object({
  incidentId: z.uuid(),
  status: z.enum(incidentStatuses),
});

export const updateIncidentSeveritySchema = z.object({
  incidentId: z.uuid(),
  severity: z.enum(severityLevels),
});

export const addParticipantSchema = z.object({
  incidentId: z.uuid(),
  userId: z.uuid(),
  incidentRole: z.enum(incidentRoles),
});

export const removeParticipantSchema = z.object({
  incidentId: z.uuid(),
  userId: z.uuid(),
});

export const createTaskSchema = z.object({
  incidentId: z.uuid(),
  title: z.string().trim().min(2, "Task title is required").max(200),
  description: z.string().trim().max(2000).optional(),
  assigneeId: z.uuid().optional().or(z.literal("")),
});

export const updateTaskSchema = z.object({
  taskId: z.uuid(),
  incidentId: z.uuid(),
  status: z.enum(taskStatuses).optional(),
  title: z.string().trim().min(2).max(200).optional(),
  assigneeId: z.uuid().nullable().optional(),
});

export const sendChatMessageSchema = z.object({
  incidentId: z.uuid(),
  content: z.string().trim().min(1, "Message cannot be empty").max(4000),
});

export const evidenceMetadataSchema = z.object({
  incidentId: z.uuid(),
  fileName: z.string().trim().min(1).max(255),
  storagePath: z.string().trim().min(1),
  fileType: z.string().trim().min(1),
  fileSize: z.number().int().positive(),
  caption: z.string().trim().max(500).optional(),
});

export type DeclareIncidentInput = z.infer<typeof declareIncidentSchema>;
export type UpdateIncidentStatusInput = z.infer<typeof updateIncidentStatusSchema>;
export type UpdateIncidentSeverityInput = z.infer<typeof updateIncidentSeveritySchema>;
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>;
