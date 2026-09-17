"use client";

import { useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarRoomChat } from "@/components/war-room/war-room-chat";
import { WarRoomEvidence } from "@/components/war-room/war-room-evidence";
import { WarRoomHeader } from "@/components/war-room/war-room-header";
import { WarRoomParticipants } from "@/components/war-room/war-room-participants";
import { WarRoomPresence } from "@/components/war-room/war-room-presence";
import { WarRoomTasks } from "@/components/war-room/war-room-tasks";
import { SimilarIncidentsPanel } from "@/components/war-room/similar-incidents-panel";
import { WarRoomAiPanel } from "@/components/war-room/war-room-ai-panel";
import { WarRoomTimeline } from "@/components/war-room/war-room-timeline";
import { useRealtimeEvidence } from "@/hooks/use-realtime-evidence";
import { useRealtimeIncident } from "@/hooks/use-realtime-incident";
import { useRealtimeTasks } from "@/hooks/use-realtime-tasks";
import { useRealtimeTimeline } from "@/hooks/use-realtime-timeline";
import { useWarRoomChat, type ChatMessage } from "@/hooks/use-war-room-chat";
import type { Task } from "@/hooks/use-realtime-tasks";
import type { TimelineEntry } from "@/hooks/use-realtime-timeline";
import { cn } from "@/lib/utils";
import type { DefaultOrgSettings } from "@/schemas/organization";
import type { Database } from "@/types/supabase";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];
type Participant = Database["public"]["Tables"]["incident_participants"]["Row"] & {
  profile?: { display_name: string | null } | null;
};
type Evidence = Database["public"]["Tables"]["evidence"]["Row"];
type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "display_name"
>;

type MobilePanel = "timeline" | "chat" | "tasks" | "more";

function mobilePanelClass(activePanel: MobilePanel, panel: MobilePanel) {
  return cn(activePanel !== panel && "hidden", "lg:block");
}

export function WarRoom({
  incident,
  commanderName,
  slaThresholds,
  participants,
  orgMembers,
  timelineEntries,
  chatMessages,
  tasks,
  evidence,
  currentUser,
  userIncidentRole,
  isOrgAdmin,
}: {
  incident: Incident;
  commanderName: string | null;
  slaThresholds: DefaultOrgSettings["slaThresholds"];
  participants: Participant[];
  orgMembers: Profile[];
  timelineEntries: TimelineEntry[];
  chatMessages: ChatMessage[];
  tasks: Task[];
  evidence: Evidence[];
  currentUser: { userId: string; displayName: string };
  userIncidentRole: Database["public"]["Enums"]["incident_role"] | null;
  isOrgAdmin: boolean;
}) {
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("timeline");

  const { incident: liveIncident } = useRealtimeIncident(incident.id, incident);
  const { entries } = useRealtimeTimeline(incident.id, timelineEntries);
  const { tasks: liveTasks } = useRealtimeTasks(incident.id, tasks);
  const { evidence: liveEvidence } = useRealtimeEvidence(incident.id, evidence);
  const chat = useWarRoomChat(incident.id, chatMessages, currentUser);

  const isCommander = userIncidentRole === "commander" || isOrgAdmin;
  const isResponder = userIncidentRole === "responder";
  const isObserver = userIncidentRole === "observer";
  const isReadOnly = liveIncident.status === "resolved";
  const canPostChat = (isCommander || isResponder) && !isReadOnly;
  const canUploadEvidence = (isCommander || isResponder) && !isReadOnly;
  const presenceRole = userIncidentRole ?? (isOrgAdmin ? "commander" : "observer");

  return (
    <div className="space-y-6">
      <WarRoomHeader
        incident={liveIncident}
        commanderName={commanderName}
        slaThresholds={slaThresholds}
        isCommander={isCommander}
        isReadOnly={isReadOnly}
      />

      <WarRoomPresence
        incidentId={incident.id}
        currentUser={{
          userId: currentUser.userId,
          displayName: currentUser.displayName,
          incidentRole: presenceRole,
        }}
      />

      <Tabs
        value={mobilePanel}
        onValueChange={(value) => setMobilePanel(value as MobilePanel)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4 lg:hidden">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="more">More</TabsTrigger>
        </TabsList>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] xl:grid-cols-[1.3fr_1fr_0.9fr]">
          <section className={mobilePanelClass(mobilePanel, "timeline")}>
            <WarRoomTimeline entries={entries} />
          </section>

          <section className={mobilePanelClass(mobilePanel, "chat")}>
            <WarRoomChat
              messages={chat.messages}
              isSending={chat.isSending}
              typingUsers={chat.typingUsers}
              sendMessage={chat.sendMessage}
              setTyping={chat.setTyping}
              canPost={canPostChat}
            />
          </section>

          <section className="space-y-4">
            <div className={mobilePanelClass(mobilePanel, "tasks")}>
              <WarRoomTasks
                incidentId={incident.id}
                tasks={liveTasks}
                orgMembers={orgMembers}
                isCommander={isCommander && !isReadOnly}
                currentUserId={currentUser.userId}
                canManageAssignedTasks={isResponder && !isReadOnly}
              />
            </div>

            <div className={mobilePanelClass(mobilePanel, "more")}>
              <WarRoomParticipants
                incidentId={incident.id}
                participants={participants}
                orgMembers={orgMembers}
                isCommander={isCommander && !isReadOnly}
              />
              <WarRoomAiPanel incidentId={incident.id} />
              <SimilarIncidentsPanel incidentId={incident.id} />
              <WarRoomEvidence
                incidentId={incident.id}
                orgId={incident.org_id}
                evidence={liveEvidence}
                canUpload={canUploadEvidence}
              />
            </div>
          </section>
        </div>
      </Tabs>

      {isObserver ? (
        <p className="text-sm text-muted-foreground">
          You are observing this war room in read-only mode.
        </p>
      ) : null}
    </div>
  );
}
