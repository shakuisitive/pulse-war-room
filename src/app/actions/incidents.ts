"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isValidStatusTransition } from "@/lib/incidents/status-transitions";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  addParticipantSchema,
  createTaskSchema,
  declareIncidentSchema,
  evidenceMetadataSchema,
  removeParticipantSchema,
  sendChatMessageSchema,
  updateIncidentSeveritySchema,
  updateIncidentStatusSchema,
  updateTaskSchema,
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

  const parsed = declareIncidentSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    severity: formData.get("severity"),
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

export async function sendChatMessageAction(
  incidentId: string,
  content: string,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = sendChatMessageSchema.safeParse({ incidentId, content });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("chat_messages").insert({
    incident_id: parsed.data.incidentId,
    org_id: session.organization.id,
    sender_id: session.userId,
    content: parsed.data.content,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Message sent." };
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
