import { z } from "zod";

export const rotationTypes = ["weekly", "daily", "custom"] as const;

export const createRotationSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  rotationType: z.enum(rotationTypes).default("weekly"),
});

export const createOnCallSlotSchema = z.object({
  rotationId: z.uuid(),
  userId: z.uuid(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
});

export const setActiveRotationSchema = z.object({
  rotationId: z.uuid(),
});

export const updateRotationSchema = z.object({
  rotationId: z.uuid(),
  name: z.string().trim().min(2, "Name is required").max(100),
  rotationType: z.enum(rotationTypes),
});

export const deleteOnCallSlotSchema = z.object({
  slotId: z.uuid(),
});

export type CreateRotationInput = z.infer<typeof createRotationSchema>;
export type CreateOnCallSlotInput = z.infer<typeof createOnCallSlotSchema>;
export type UpdateRotationInput = z.infer<typeof updateRotationSchema>;
