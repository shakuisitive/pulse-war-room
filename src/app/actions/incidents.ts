"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isValidStatusTransition } from "@/lib/incidents/status-transitions";
import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { findMentionedUserIds } from "@/lib/incidents/mentions";
import {
  addParticipantSchema,
  createTaskSchema,
  declareIncidentSchema,
  deleteTaskSchema,
  evidenceMetadataSchema,
  inviteStakeholderSchema,
  reassignCommanderSchema,
  removeParticipantSchema,
  sendChatMessageSchema,
  updateIncidentSeveritySchema,
  updateIncidentStatusSchema,
  updateIncidentTitleSchema,
  updateTaskSchema,
  updateVisibilitySchema,
} from "@/schemas/incident";
import type { ActionState } from "@/app/actions/organization";

export type { ActionState };

export async function declareIncidentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in to declare an incident." };
  }

  const metadata: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("metadata.") && typeof value === "string" && value.trim()) {
      metadata[key.slice("metadata.".length)] = value.trim();
    }
  }

  const parsed = declareIncidentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    severity: formData.get("severity"),
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("incidents")
    .insert({
      org_id: session.organization.id,
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      severity: parsed.data.severity,
      declared_by: session.userId,
      metadata: parsed.data.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  redirect(`/incidents/${data.id}`);
}

export async function updateIncidentStatusAction(
  incidentId: string,
  status: string,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = updateIncidentStatusSchema.safeParse({ incidentId, status });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: incident, error: fetchError } = await supabase
    .from("incidents")
    .select("status")
    .eq("id", parsed.data.incidentId)
    .eq("org_id", session.organization.id)
    .single();

  if (fetchError || !incident) {
    return { error: "Incident not found." };
  }

  if (
    !isValidStatusTransition(incident.status, parsed.data.status)
  ) {
    return { error: "Invalid status transition." };
  }

  const { error } = await supabase
    .from("incidents")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.incidentId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  revalidatePath("/dashboard");
  return { success: "Status updated." };
}

export async function updateIncidentSeverityAction(
  incidentId: string,
  severity: string,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = updateIncidentSeveritySchema.safeParse({
    incidentId,
    severity,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("incidents")
    .update({ severity: parsed.data.severity })
    .eq("id", parsed.data.incidentId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  revalidatePath("/dashboard");
  return { success: "Severity updated." };
}

export async function updateIncidentTitleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = updateIncidentTitleSchema.safeParse({
    incidentId: formData.get("incidentId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("incidents")
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? "",
    })
    .eq("id", parsed.data.incidentId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  revalidatePath("/dashboard");
  return { success: "Incident details updated." };
}

export async function reassignCommanderAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = reassignCommanderSchema.safeParse({
    incidentId: formData.get("incidentId"),
    commanderId: formData.get("commanderId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("incidents")
    .update({ commander_id: parsed.data.commanderId })
    .eq("id", parsed.data.incidentId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  const { error: participantError } = await supabase
    .from("incident_participants")
    .upsert(
      {
        incident_id: parsed.data.incidentId,
        user_id: parsed.data.commanderId,
        org_id: session.organization.id,
        incident_role: "commander",
        is_active: true,
        left_at: null,
      },
      { onConflict: "incident_id,user_id" },
    );

  if (participantError) {
    return { error: participantError.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  revalidatePath("/dashboard");
  return { success: "Commander reassigned." };
}

export async function addParticipantAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = addParticipantSchema.safeParse({
    incidentId: formData.get("incidentId"),
    userId: formData.get("userId"),
    incidentRole: formData.get("incidentRole"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("incident_participants").upsert(
    {
      incident_id: parsed.data.incidentId,
      user_id: parsed.data.userId,
      org_id: session.organization.id,
      incident_role: parsed.data.incidentRole,
      is_active: true,
      left_at: null,
    },
    { onConflict: "incident_id,user_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  return { success: "Participant added." };
}

export async function removeParticipantAction(
  incidentId: string,
  userId: string,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = removeParticipantSchema.safeParse({ incidentId, userId });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("incident_participants")
    .update({ is_active: false, left_at: new Date().toISOString() })
    .eq("incident_id", parsed.data.incidentId)
    .eq("user_id", parsed.data.userId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  return { success: "Participant removed." };
}

export async function createTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const assigneeRaw = formData.get("assigneeId")?.toString() ?? "";

  const parsed = createTaskSchema.safeParse({
    incidentId: formData.get("incidentId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    assigneeId: assigneeRaw || undefined,
    dueAt: formData.get("dueAt")?.toString() ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    incident_id: parsed.data.incidentId,
    org_id: session.organization.id,
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    assignee_id: parsed.data.assigneeId || null,
    created_by: session.userId,
    due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  return { success: "Task created." };
}

export async function updateTaskAction(
  taskId: string,
  incidentId: string,
  updates: { status?: string; assigneeId?: string | null },
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = updateTaskSchema.safeParse({
    taskId,
    incidentId,
    status: updates.status,
    assigneeId: updates.assigneeId,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.assigneeId !== undefined
        ? { assignee_id: parsed.data.assigneeId }
        : {}),
    })
    .eq("id", parsed.data.taskId)
    .eq("incident_id", parsed.data.incidentId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  return { success: "Task updated." };
}

export async function deleteTaskAction(
  taskId: string,
  incidentId: string,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = deleteTaskSchema.safeParse({ taskId, incidentId });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", parsed.data.taskId)
    .eq("incident_id", parsed.data.incidentId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  return { success: "Task deleted." };
}

export async function sendChatMessageAction(
  incidentId: string,
  content: string,
  isStakeholderVisible = false,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = sendChatMessageSchema.safeParse({
    incidentId,
    content,
    isStakeholderVisible,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("chat_messages").insert({
    incident_id: parsed.data.incidentId,
    org_id: session.organization.id,
    sender_id: session.userId,
    content: parsed.data.content,
    is_stakeholder_visible: parsed.data.isStakeholderVisible ?? false,
  });

  if (error) {
    return { error: error.message };
  }

  const { data: mentionCandidates } = await supabase
    .from("incident_participants")
    .select("user_id, profile:profiles!incident_participants_user_id_fkey(display_name)")
    .eq("incident_id", parsed.data.incidentId)
    .eq("is_active", true);

  const mentionedIds = findMentionedUserIds(
    parsed.data.content,
    (mentionCandidates ?? []).flatMap((row) => {
      const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
      if (!profile?.display_name) {
        return [];
      }
      return [{ id: row.user_id, display_name: profile.display_name }];
    }),
  ).filter((userId) => userId !== session.userId);

  for (const userId of mentionedIds) {
    await supabase.rpc("enqueue_notification_job", {
      p_payload: {
        org_id: session.organization.id,
        user_id: userId,
        notification_type: "mentioned",
        title: "You were mentioned in a war room",
        body: parsed.data.content.slice(0, 180),
        incident_id: parsed.data.incidentId,
      },
    });
  }

  return { success: "Message sent." };
}

export async function updateChatVisibilityAction(
  messageId: string,
  incidentId: string,
  isStakeholderVisible: boolean,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = updateVisibilitySchema.safeParse({
    id: messageId,
    incidentId,
    isStakeholderVisible,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("chat_messages")
    .update({ is_stakeholder_visible: parsed.data.isStakeholderVisible })
    .eq("id", parsed.data.id)
    .eq("incident_id", parsed.data.incidentId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  return { success: "Chat visibility updated." };
}

export async function updateEvidenceVisibilityAction(
  evidenceId: string,
  incidentId: string,
  isStakeholderVisible: boolean,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = updateVisibilitySchema.safeParse({
    id: evidenceId,
    incidentId,
    isStakeholderVisible,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("evidence")
    .update({ is_stakeholder_visible: parsed.data.isStakeholderVisible })
    .eq("id", parsed.data.id)
    .eq("incident_id", parsed.data.incidentId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  return { success: "Evidence visibility updated." };
}

export async function createEvidenceRecordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = evidenceMetadataSchema.safeParse({
    incidentId: formData.get("incidentId"),
    fileName: formData.get("fileName"),
    storagePath: formData.get("storagePath"),
    fileType: formData.get("fileType"),
    fileSize: Number(formData.get("fileSize")),
    caption: formData.get("caption") ?? "",
    isStakeholderVisible: formData.get("isStakeholderVisible") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("evidence").insert({
    incident_id: parsed.data.incidentId,
    org_id: session.organization.id,
    uploaded_by: session.userId,
    file_name: parsed.data.fileName,
    storage_path: parsed.data.storagePath,
    file_type: parsed.data.fileType,
    file_size: parsed.data.fileSize,
    caption: parsed.data.caption || null,
    is_stakeholder_visible: parsed.data.isStakeholderVisible ?? false,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  return { success: "Evidence uploaded." };
}

export async function getEvidenceSignedUrlAction(storagePath: string) {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." as const, url: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("evidence")
    .createSignedUrl(storagePath, 900);

  if (error) {
    return { error: error.message, url: null };
  }

  return { error: null, url: data.signedUrl };
}

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function inviteStakeholderAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = inviteStakeholderSchema.safeParse({
    incidentId: formData.get("incidentId"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: participant } = await supabase
    .from("incident_participants")
    .select("incident_role")
    .eq("incident_id", parsed.data.incidentId)
    .eq("user_id", session.userId)
    .eq("is_active", true)
    .maybeSingle();

  const canInvite =
    isOrgAdmin(session.profile.org_role) ||
    participant?.incident_role === "commander";

  if (!canInvite) {
    return { error: "Only the commander or an admin can invite stakeholders." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/incidents/${parsed.data.incidentId}`,
      data: {
        org_id: session.organization.id,
        org_role: "member",
        invited_by: session.userId,
        stakeholder_incident_id: parsed.data.incidentId,
        is_stakeholder_only: true,
      },
    },
  );

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id, is_stakeholder_only")
      .eq("id", data.user.id)
      .maybeSingle();

    await admin.from("profiles").upsert({
      id: data.user.id,
      org_id: session.organization.id,
      org_role: "member",
      display_name: parsed.data.email.split("@")[0] ?? "Stakeholder",
      is_stakeholder_only: existingProfile?.is_stakeholder_only ?? true,
    });

    await admin.from("incident_participants").upsert(
      {
        incident_id: parsed.data.incidentId,
        user_id: data.user.id,
        org_id: session.organization.id,
        incident_role: "stakeholder",
        is_active: true,
        left_at: null,
      },
      { onConflict: "incident_id,user_id" },
    );
  }

  revalidatePath(`/incidents/${parsed.data.incidentId}`);
  return { success: `Stakeholder invitation sent to ${parsed.data.email}.` };
}
