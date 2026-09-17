import { notFound, redirect } from "next/navigation";

import { PostMortemEditor } from "@/components/post-mortem/post-mortem-editor";
import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function IncidentPostMortemPage({
  params,
}: PageProps<"/incidents/[id]/post-mortem">) {
  const { id } = await params;
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: incident } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", id)
    .eq("org_id", session.organization.id)
    .maybeSingle();

  if (!incident) {
    notFound();
  }

  if (incident.status !== "resolved") {
    redirect(`/incidents/${id}`);
  }

  const { data: participant } = await supabase
    .from("incident_participants")
    .select("incident_role")
    .eq("incident_id", id)
    .eq("user_id", session.userId)
    .eq("is_active", true)
    .maybeSingle();

  const canEdit =
    isOrgAdmin(session.profile.org_role) ||
    participant?.incident_role === "commander";

  let { data: postMortem } = await supabase
    .from("post_mortems")
    .select("*")
    .eq("incident_id", id)
    .maybeSingle();

  if (!postMortem && canEdit) {
    const { data: created } = await supabase
      .from("post_mortems")
      .insert({
        incident_id: id,
        org_id: session.organization.id,
        authored_by: session.userId,
      })
      .select("*")
      .single();

    postMortem = created;
  }

  if (!postMortem) {
    notFound();
  }

  const [{ data: actionItems }, { data: members }] = await Promise.all([
      supabase
        .from("action_items")
        .select("*")
        .eq("post_mortem_id", postMortem.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, display_name")
        .eq("org_id", session.organization.id)
        .eq("is_active", true)
        .order("display_name"),
    ]);

  return (
    <PostMortemEditor
      incident={incident}
      postMortem={postMortem}
      actionItems={actionItems ?? []}
      orgMembers={members ?? []}
      canEdit={canEdit}
    />
  );
}
