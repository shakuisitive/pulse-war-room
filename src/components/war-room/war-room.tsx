"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WarRoomChat } from "@/components/war-room/war-room-chat";
import { WarRoomEvidence } from "@/components/war-room/war-room-evidence";
import { WarRoomHeader } from "@/components/war-room/war-room-header";
import { WarRoomParticipants } from "@/components/war-room/war-room-participants";
import { WarRoomPresence } from "@/components/war-room/war-room-presence";
import { WarRoomTasks } from "@/components/war-room/war-room-tasks";
import { WarRoomTimeline } from "@/components/war-room/war-room-timeline";
import type { ChatMessage } from "@/hooks/use-war-room-chat";
import type { Task } from "@/hooks/use-realtime-tasks";
import type { TimelineEntry } from "@/hooks/use-realtime-timeline";
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
  const isCommander = userIncidentRole === "commander" || isOrgAdmin;
  const isResponder = userIncidentRole === "responder";
  const isObserver = userIncidentRole === "observer";
  const isReadOnly = incident.status === "resolved";
  const canPostChat = (isCommander || isResponder) && !isReadOnly;
  const canUploadEvidence = (isCommander || isResponder) && !isReadOnly;
  const presenceRole = userIncidentRole ?? (isOrgAdmin ? "commander" : "observer");

  return (
    <div className="space-y-6">
      <WarRoomHeader
        incident={incident}
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

      <div className="hidden gap-4 lg:grid lg:grid-cols-[1.2fr_1fr] xl:grid-cols-[1.3fr_1fr_0.9fr]">
        <WarRoomTimeline
          incidentId={incident.id}
          initialEntries={timelineEntries}
        />
        <WarRoomChat
          incidentId={incident.id}
          initialMessages={chatMessages}
          currentUser={currentUser}
          canPost={canPostChat}
        />
        <div className="space-y-4">
          <WarRoomTasks
            incidentId={incident.id}
            initialTasks={tasks}
            orgMembers={orgMembers}
            isCommander={isCommander && !isReadOnly}
            currentUserId={currentUser.userId}
            canManageAssignedTasks={isResponder && !isReadOnly}
          />
          <WarRoomParticipants
            incidentId={incident.id}
            participants={participants}
            orgMembers={orgMembers}
            isCommander={isCommander && !isReadOnly}
          />
          <WarRoomEvidence
            incidentId={incident.id}
            orgId={incident.org_id}
            initialEvidence={evidence}
            canUpload={canUploadEvidence}
          />
        </div>
      </div>

      <div className="lg:hidden">
        <Tabs defaultValue="timeline">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="more">More</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-4">
            <WarRoomTimeline
              incidentId={incident.id}
              initialEntries={timelineEntries}
            />
          </TabsContent>
          <TabsContent value="chat" className="mt-4">
            <WarRoomChat
              incidentId={incident.id}
              initialMessages={chatMessages}
              currentUser={currentUser}
              canPost={canPostChat}
            />
          </TabsContent>
          <TabsContent value="tasks" className="mt-4">
            <WarRoomTasks
              incidentId={incident.id}
              initialTasks={tasks}
              orgMembers={orgMembers}
              isCommander={isCommander && !isReadOnly}
              currentUserId={currentUser.userId}
              canManageAssignedTasks={isResponder && !isReadOnly}
            />
          </TabsContent>
          <TabsContent value="more" className="mt-4 space-y-4">
            <WarRoomParticipants
              incidentId={incident.id}
              participants={participants}
              orgMembers={orgMembers}
              isCommander={isCommander && !isReadOnly}
            />
            <WarRoomEvidence
              incidentId={incident.id}
              orgId={incident.org_id}
              initialEvidence={evidence}
              canUpload={canUploadEvidence}
            />
          </TabsContent>
        </Tabs>
      </div>

      {isObserver ? (
        <p className="text-sm text-muted-foreground">
          You are observing this war room in read-only mode.
        </p>
      ) : null}
    </div>
  );
}
