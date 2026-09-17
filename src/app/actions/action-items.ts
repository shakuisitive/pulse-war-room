"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/app/actions/organization";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  createActionItemSchema,
  deleteActionItemSchema,
  updateActionItemStatusSchema,
} from "@/schemas/action-item";

export async function createActionItemAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = createActionItemSchema.safeParse({
    postMortemId: formData.get("postMortemId"),
    incidentId: formData.get("incidentId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    assigneeId: formData.get("assigneeId") ?? "",
    dueAt: formData.get("dueAt") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("action_items").insert({
    post_mortem_id: parsed.data.postMortemId,
    incident_id: parsed.data.incidentId,
    org_id: session.organization.id,
    title: parsed.data.title,
    description: parsed.data.description ?? "",
    assignee_id: parsed.data.assigneeId || null,
    due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/incidents/${parsed.data.incidentId}/post-mortem`);

  return { success: "Action item created." };
}

export async function updateActionItemStatusAction(
  actionItemId: string,
  status: string,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = updateActionItemStatusSchema.safeParse({ actionItemId, status });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: item, error: fetchError } = await supabase
    .from("action_items")
    .select("id, incident_id, assignee_id")
    .eq("id", parsed.data.actionItemId)
    .maybeSingle();

  if (fetchError || !item) {
    return { error: "Action item not found." };
  }

  const { error } = await supabase
    .from("action_items")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.actionItemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/incidents/${item.incident_id}/post-mortem`);

  return { success: "Action item updated." };
}

export async function deleteActionItemAction(actionItemId: string): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = deleteActionItemSchema.safeParse({ actionItemId });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("action_items")
    .select("incident_id")
    .eq("id", parsed.data.actionItemId)
    .maybeSingle();

  const { error } = await supabase
    .from("action_items")
    .delete()
    .eq("id", parsed.data.actionItemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");

  if (item?.incident_id) {
    revalidatePath(`/incidents/${item.incident_id}/post-mortem`);
  }

  return { success: "Action item deleted." };
}
