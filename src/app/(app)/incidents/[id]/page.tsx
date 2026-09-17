import { notFound, redirect } from "next/navigation";

import { StakeholderView } from "@/components/war-room/stakeholder-view";
import { WarRoom } from "@/components/war-room/war-room";
import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { defaultOrgSettings, type DefaultOrgSettings } from "@/schemas/organization";

function parseOrgSettings(settings: unknown): DefaultOrgSettings {
  if (
    settings &&
    typeof settings === "object" &&
    "slaThresholds" in settings
  ) {
    return settings as DefaultOrgSettings;
  }

  return defaultOrgSettings;
}

export default async function IncidentPage({
  params,
}: PageProps<"/incidents/[id]">) {
  const { id } = await params;
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: incident, error: incidentError } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", id)
    .eq("org_id", session.organization.id)
    .maybeSingle();

  if (incidentError || !incident) {
    notFound();
  }

  const [
    participantsResult,
    timelineResult,
    chatResult,
    tasksResult,
    evidenceResult,
    membersResult,
    commanderResult,
    userParticipantResult,
  ] = await Promise.all([
    supabase
      .from("incident_participants")
      .select("*, profile:profiles!incident_participants_user_id_fkey(display_name)")
      .eq("incident_id", id)
      .eq("org_id", session.organization.id),
    supabase
      .from("timeline_entries")
      .select("*, actor:profiles!timeline_entries_actor_id_fkey(display_name)")
      .eq("incident_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("chat_messages")
      .select("*, sender:profiles!chat_messages_sender_id_fkey(display_name)")
      .eq("incident_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(display_name)")
      .eq("incident_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("evidence")
      .select("*")
      .eq("incident_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("org_id", session.organization.id)
      .eq("is_active", true)
      .order("display_name"),
    incident.commander_id
      ? supabase
          .from("profiles")
          .select("display_name")
          .eq("id", incident.commander_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("incident_participants")
      .select("incident_role")
      .eq("incident_id", id)
      .eq("user_id", session.userId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const userRole = userParticipantResult.data?.incident_role ?? null;

  if (!userRole && !isOrgAdmin(session.profile.org_role)) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">{incident.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You can see this incident exists, but you are not a participant yet. Ask
          the commander to add you to the war room.
        </p>
      </div>
    );
  }

  if (userRole === "stakeholder") {
    return (
      <StakeholderView
        incident={incident}
        commanderName={commanderResult.data?.display_name ?? null}
        timelineEntries={timelineResult.data ?? []}
      />
    );
  }

  const slaThresholds = parseOrgSettings(session.organization.settings).slaThresholds;

  return (
    <WarRoom
      incident={incident}
      commanderName={commanderResult.data?.display_name ?? null}
      slaThresholds={slaThresholds}
      participants={participantsResult.data ?? []}
      orgMembers={membersResult.data ?? []}
      timelineEntries={timelineResult.data ?? []}
      chatMessages={chatResult.data ?? []}
      tasks={tasksResult.data ?? []}
      evidence={evidenceResult.data ?? []}
      currentUser={{
        userId: session.userId,
        displayName: session.profile.display_name,
      }}
      userIncidentRole={userRole}
      isOrgAdmin={isOrgAdmin(session.profile.org_role)}
    />
  );
}
