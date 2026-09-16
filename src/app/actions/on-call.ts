"use server";

import { revalidatePath } from "next/cache";

import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  createOnCallSlotSchema,
  createRotationSchema,
  setActiveRotationSchema,
} from "@/schemas/on-call";
import type { ActionState } from "@/app/actions/organization";

function requireAdmin() {
  return getSessionContext().then((session) => {
    if (!session || !isOrgAdmin(session.profile.org_role)) {
      return { session: null, error: "Admin access required." as const };
    }
    return { session, error: null };
  });
}

export async function createRotationAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, error: authError } = await requireAdmin();

  if (authError || !session) {
    return { error: authError ?? "Unauthorized" };
  }

  const parsed = createRotationSchema.safeParse({
    name: formData.get("name"),
    rotationType: formData.get("rotationType") ?? "weekly",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("on_call_rotations").insert({
    org_id: session.organization.id,
    name: parsed.data.name,
    rotation_type: parsed.data.rotationType,
    is_active: false,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/on-call");
  return { success: "Rotation created." };
}

export async function createOnCallSlotAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { session, error: authError } = await requireAdmin();

  if (authError || !session) {
    return { error: authError ?? "Unauthorized" };
  }

  const dayRaw = formData.get("dayOfWeek")?.toString();

  const parsed = createOnCallSlotSchema.safeParse({
    rotationId: formData.get("rotationId"),
    userId: formData.get("userId"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    dayOfWeek: dayRaw ? Number(dayRaw) : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const start = new Date(parsed.data.startTime);
  const end = new Date(parsed.data.endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Invalid date or time." };
  }

  if (end <= start) {
    return { error: "End time must be after start time." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("on_call_slots").insert({
    rotation_id: parsed.data.rotationId,
    org_id: session.organization.id,
    user_id: parsed.data.userId,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    day_of_week: parsed.data.dayOfWeek ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/on-call");
  return { success: "On-call slot added." };
}

export async function setActiveRotationAction(
  rotationId: string,
): Promise<ActionState> {
  const { session, error: authError } = await requireAdmin();

  if (authError || !session) {
    return { error: authError ?? "Unauthorized" };
  }

  const parsed = setActiveRotationSchema.safeParse({ rotationId });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { error: deactivateError } = await supabase
    .from("on_call_rotations")
    .update({ is_active: false })
    .eq("org_id", session.organization.id);

  if (deactivateError) {
    return { error: deactivateError.message };
  }

  const { error } = await supabase
    .from("on_call_rotations")
    .update({ is_active: true })
    .eq("id", parsed.data.rotationId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/on-call");
  return { success: "Active rotation updated." };
}

export async function deleteRotationAction(rotationId: string): Promise<ActionState> {
  const { session, error: authError } = await requireAdmin();

  if (authError || !session) {
    return { error: authError ?? "Unauthorized" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("on_call_rotations")
    .delete()
    .eq("id", rotationId)
    .eq("org_id", session.organization.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/on-call");
  return { success: "Rotation deleted." };
}
