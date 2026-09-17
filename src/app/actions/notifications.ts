"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/app/actions/organization";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", session.userId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: "Notification marked as read." };
}

export async function markAllNotificationsReadAction(): Promise<ActionState> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", session.userId)
    .eq("org_id", session.organization.id)
    .eq("is_read", false);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: "All notifications marked as read." };
}
