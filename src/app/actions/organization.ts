"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createOrganizationSchema,
  defaultOrgSettings,
  inviteMemberSchema,
  orgSettingsSchema,
  profileSchema,
  updateMemberRoleSchema,
} from "@/schemas/organization";

export type ActionState = {
  error?: string;
  success?: string;
};

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function createOrganizationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to create an organization." };
  }

  const { data: orgId, error } = await supabase.rpc(
    "create_organization_with_owner",
    {
      org_name: parsed.data.name,
      org_slug: parsed.data.slug,
      owner_display_name: parsed.data.displayName,
    },
  );

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("organizations")
    .update({
      settings: defaultOrgSettings,
    })
    .eq("id", orgId);

  await supabase.from("escalation_policies").insert([
    {
      org_id: orgId,
      severity: "sev1",
      acknowledge_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev1.acknowledgeMinutes,
      resolve_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev1.resolveMinutes,
      escalation_action: {},
    },
    {
      org_id: orgId,
      severity: "sev2",
      acknowledge_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev2.acknowledgeMinutes,
      resolve_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev2.resolveMinutes,
      escalation_action: {},
    },
    {
      org_id: orgId,
      severity: "sev3",
      acknowledge_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev3.acknowledgeMinutes,
      resolve_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev3.resolveMinutes,
      escalation_action: {},
    },
    {
      org_id: orgId,
      severity: "sev4",
      acknowledge_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev4.acknowledgeMinutes,
      resolve_threshold_minutes:
        defaultOrgSettings.slaThresholds.sev4.resolveMinutes,
      escalation_action: {},
    },
  ]);

  await supabase.auth.refreshSession();
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function updateOrgSettingsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session || !isOrgAdmin(session.profile.org_role)) {
    return { error: "You do not have permission to update organization settings." };
  }

  const parsed = orgSettingsSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    requireMfa: formData.get("requireMfa") === "on",
    slaThresholds: {
      sev1: {
        acknowledgeMinutes: Number(formData.get("sev1Ack")),
        resolveMinutes: Number(formData.get("sev1Resolve")),
      },
      sev2: {
        acknowledgeMinutes: Number(formData.get("sev2Ack")),
        resolveMinutes: Number(formData.get("sev2Resolve")),
      },
      sev3: {
        acknowledgeMinutes: Number(formData.get("sev3Ack")),
        resolveMinutes: Number(formData.get("sev3Resolve")),
      },
      sev4: {
        acknowledgeMinutes: Number(formData.get("sev4Ack")),
        resolveMinutes: Number(formData.get("sev4Resolve")),
      },
    },
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      settings: parsed.data,
    })
    .eq("id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: "Organization settings saved." };
}

export async function inviteMemberAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session || !isOrgAdmin(session.profile.org_role)) {
    return { error: "You do not have permission to invite members." };
  }

  const parsed = inviteMemberSchema.safeParse({
    email: formData.get("email"),
    orgRole: formData.get("orgRole"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
      data: {
        org_id: session.organization.id,
        org_role: parsed.data.orgRole,
        invited_by: session.userId,
      },
    },
  );

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      org_id: session.organization.id,
      org_role: parsed.data.orgRole,
      display_name: parsed.data.email.split("@")[0] ?? "Member",
    });

    if (profileError && profileError.code !== "23505") {
      return { error: profileError.message };
    }
  }

  revalidatePath("/team");
  return { success: `Invitation sent to ${parsed.data.email}.` };
}

export async function updateMemberRoleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session || !isOrgAdmin(session.profile.org_role)) {
    return { error: "You do not have permission to change member roles." };
  }

  const parsed = updateMemberRoleSchema.safeParse({
    userId: formData.get("userId"),
    orgRole: formData.get("orgRole"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ org_role: parsed.data.orgRole })
    .eq("id", parsed.data.userId)
    .eq("org_id", session.organization.id)
    .neq("org_role", "owner");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/team");
  return { success: "Member role updated." };
}

export async function removeMemberFormAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const userId = formData.get("userId")?.toString();

  if (!userId) {
    return { error: "Missing member id." };
  }

  return removeMemberAction(userId);
}

export async function removeMemberAction(userId: string): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session || !isOrgAdmin(session.profile.org_role)) {
    return { error: "You do not have permission to remove members." };
  }

  if (userId === session.userId) {
    return { error: "You cannot remove yourself." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId)
    .eq("org_id", session.organization.id)
    .neq("org_role", "owner");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/team");
  return { success: "Member removed." };
}

export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    avatarUrl: formData.get("avatarUrl") || "",
    notificationPreferences: {
      emailEnabled: formData.get("emailEnabled") === "on",
      inAppEnabled: formData.get("inAppEnabled") === "on",
    },
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      avatar_url: parsed.data.avatarUrl || null,
      notification_preferences: parsed.data.notificationPreferences,
    })
    .eq("id", session.userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { success: "Profile updated." };
}
