import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(slugRegex, "Use lowercase letters, numbers, and hyphens only"),
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(80),
});

export const orgSettingsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(slugRegex),
  requireMfa: z.boolean(),
  slaThresholds: z.object({
    sev1: z.object({
      acknowledgeMinutes: z.number().int().positive(),
      resolveMinutes: z.number().int().positive(),
    }),
    sev2: z.object({
      acknowledgeMinutes: z.number().int().positive(),
      resolveMinutes: z.number().int().positive(),
    }),
    sev3: z.object({
      acknowledgeMinutes: z.number().int().positive(),
      resolveMinutes: z.number().int().positive(),
    }),
    sev4: z.object({
      acknowledgeMinutes: z.number().int().positive(),
      resolveMinutes: z.number().int().positive(),
    }),
  }),
});

export const inviteMemberSchema = z.object({
  email: z.email("Enter a valid email address"),
  orgRole: z.enum(["admin", "member"]),
});

export const updateMemberRoleSchema = z.object({
  userId: z.uuid(),
  orgRole: z.enum(["admin", "member"]),
});

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  avatarUrl: z.union([z.url(), z.literal("")]).optional(),
  notificationPreferences: z.object({
    emailEnabled: z.boolean(),
    inAppEnabled: z.boolean(),
  }),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type OrgSettingsInput = z.infer<typeof orgSettingsSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;

export const defaultOrgSettings = {
  requireMfa: false,
  slaThresholds: {
    sev1: { acknowledgeMinutes: 5, resolveMinutes: 60 },
    sev2: { acknowledgeMinutes: 15, resolveMinutes: 240 },
    sev3: { acknowledgeMinutes: 60, resolveMinutes: 1440 },
    sev4: { acknowledgeMinutes: 240, resolveMinutes: 10080 },
  },
};

export type DefaultOrgSettings = typeof defaultOrgSettings;
