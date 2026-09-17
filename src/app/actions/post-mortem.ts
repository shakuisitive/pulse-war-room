"use server";

import { revalidatePath } from "next/cache";

import type { ActionState } from "@/app/actions/organization";
import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { parsePostMortemDraft } from "@/lib/post-mortem/parse-ai-draft";
import { createClient } from "@/lib/supabase/server";
import {
  applyAiDraftSchema,
  postMortemSectionSchema,
  publishPostMortemSchema,
} from "@/schemas/post-mortem";

async function assertCanManagePostMortem(incidentId: string) {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." as const, session: null };
  }

  if (isOrgAdmin(session.profile.org_role)) {
    return { session };
  }

  const supabase = await createClient();
  const { data: participant } = await supabase
    .from("incident_participants")
    .select("incident_role")
    .eq("incident_id", incidentId)
    .eq("user_id", session.userId)
    .eq("is_active", true)
    .maybeSingle();

  if (participant?.incident_role !== "commander") {
    return { error: "Only the incident commander or an admin can edit post-mortems." as const, session: null };
  }

  return { session };
}

export async function savePostMortemAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = postMortemSectionSchema.safeParse({
    postMortemId: formData.get("postMortemId"),
    summary: formData.get("summary") ?? "",
    timelineNarrative: formData.get("timelineNarrative") ?? "",
    rootCause: formData.get("rootCause") ?? "",
    contributingFactors: formData.get("contributingFactors") ?? "",
    lessonsLearned: formData.get("lessonsLearned") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: postMortem, error: fetchError } = await supabase
    .from("post_mortems")
    .select("id, incident_id, is_published")
    .eq("id", parsed.data.postMortemId)
    .maybeSingle();

  if (fetchError || !postMortem) {
    return { error: "Post-mortem not found." };
  }

  if (postMortem.is_published) {
    return { error: "Published post-mortems cannot be edited." };
  }

  const access = await assertCanManagePostMortem(postMortem.incident_id);

  if ("error" in access && access.error) {
    return { error: access.error };
  }

  const { error } = await supabase
    .from("post_mortems")
    .update({
      summary: parsed.data.summary,
      timeline_narrative: parsed.data.timelineNarrative,
      root_cause: parsed.data.rootCause,
      contributing_factors: parsed.data.contributingFactors,
      lessons_learned: parsed.data.lessonsLearned,
      authored_by: access.session!.userId,
    })
    .eq("id", parsed.data.postMortemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${postMortem.incident_id}/post-mortem`);
  revalidatePath("/post-mortems");

  return { success: "Post-mortem saved." };
}

export async function publishPostMortemAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = publishPostMortemSchema.safeParse({
    postMortemId: formData.get("postMortemId"),
    isStakeholderVisible: formData.get("isStakeholderVisible") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: postMortem, error: fetchError } = await supabase
    .from("post_mortems")
    .select("id, incident_id, is_published")
    .eq("id", parsed.data.postMortemId)
    .maybeSingle();

  if (fetchError || !postMortem) {
    return { error: "Post-mortem not found." };
  }

  if (postMortem.is_published) {
    return { error: "This post-mortem is already published." };
  }

  const access = await assertCanManagePostMortem(postMortem.incident_id);

  if ("error" in access && access.error) {
    return { error: access.error };
  }

  const { error } = await supabase
    .from("post_mortems")
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
      is_stakeholder_visible: parsed.data.isStakeholderVisible,
    })
    .eq("id", parsed.data.postMortemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${postMortem.incident_id}/post-mortem`);
  revalidatePath(`/incidents/${postMortem.incident_id}`);
  revalidatePath("/post-mortems");
  revalidatePath("/dashboard");

  return { success: "Post-mortem published." };
}

export async function applyAiDraftToPostMortemAction(
  postMortemId: string,
  draft: string,
): Promise<ActionState> {
  const parsed = applyAiDraftSchema.safeParse({ postMortemId, draft });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: postMortem, error: fetchError } = await supabase
    .from("post_mortems")
    .select("id, incident_id, is_published")
    .eq("id", parsed.data.postMortemId)
    .maybeSingle();

  if (fetchError || !postMortem) {
    return { error: "Post-mortem not found." };
  }

  if (postMortem.is_published) {
    return { error: "Published post-mortems cannot be edited." };
  }

  const access = await assertCanManagePostMortem(postMortem.incident_id);

  if ("error" in access && access.error) {
    return { error: access.error };
  }

  const sections = parsePostMortemDraft(parsed.data.draft);
  const { error } = await supabase
    .from("post_mortems")
    .update({
      summary: sections.summary,
      timeline_narrative: sections.timelineNarrative,
      root_cause: sections.rootCause,
      contributing_factors: sections.contributingFactors,
      lessons_learned: sections.lessonsLearned,
      authored_by: access.session!.userId,
    })
    .eq("id", parsed.data.postMortemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/incidents/${postMortem.incident_id}/post-mortem`);

  return { success: "AI draft applied to post-mortem." };
}

export async function ensurePostMortemForIncidentAction(
  incidentId: string,
): Promise<ActionState & { postMortemId?: string }> {
  const session = await getSessionContext();

  if (!session) {
    return { error: "You must be signed in." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("post_mortems")
    .select("id")
    .eq("incident_id", incidentId)
    .maybeSingle();

  if (existing?.id) {
    return { success: "Post-mortem ready.", postMortemId: existing.id };
  }

  const access = await assertCanManagePostMortem(incidentId);

  if ("error" in access && access.error) {
    return { error: access.error };
  }

  const { data: incident } = await supabase
    .from("incidents")
    .select("id, org_id, status")
    .eq("id", incidentId)
    .maybeSingle();

  if (!incident || incident.status !== "resolved") {
    return { error: "Post-mortems are created when an incident is resolved." };
  }

  const { data, error } = await supabase
    .from("post_mortems")
    .insert({
      incident_id: incidentId,
      org_id: incident.org_id,
      authored_by: access.session!.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  return { success: "Post-mortem created.", postMortemId: data.id };
}
