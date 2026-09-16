"use client";

import { useActionState, useTransition } from "react";

import {
  addParticipantAction,
  removeParticipantAction,
  type ActionState,
} from "@/app/actions/incidents";
import { FormMessage } from "@/components/auth/form-message";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { incidentRoles } from "@/schemas/incident";
import type { Database } from "@/types/supabase";

type Participant = Database["public"]["Tables"]["incident_participants"]["Row"] & {
  profile?: { display_name: string | null } | null;
};

type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "display_name"
>;

const initialState: ActionState = {};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-input px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function WarRoomParticipants({
  incidentId,
  participants,
  orgMembers,
  isCommander,
}: {
  incidentId: string;
  participants: Participant[];
  orgMembers: Profile[];
  isCommander: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    addParticipantAction,
    initialState,
  );
  const [isRemoving, startTransition] = useTransition();

  const activeParticipantIds = new Set(
    participants.filter((p) => p.is_active).map((p) => p.user_id),
  );

  const availableMembers = orgMembers.filter(
    (member) => !activeParticipantIds.has(member.id),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Participants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {participants.filter((p) => p.is_active).length === 0 ? (
            <p className="text-sm text-muted-foreground">No active participants.</p>
          ) : (
            participants
              .filter((participant) => participant.is_active)
              .map((participant) => (
                <div
                  key={participant.user_id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8">
                      <AvatarFallback>
                        {(participant.profile?.display_name ?? "?")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {participant.profile?.display_name ?? "Unknown"}
                      </p>
                      <Badge variant="secondary" className="capitalize">
                        {participant.incident_role}
                      </Badge>
                    </div>
                  </div>

                  {isCommander && participant.incident_role !== "commander" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isRemoving}
                      onClick={() => {
                        startTransition(async () => {
                          await removeParticipantAction(
                            incidentId,
                            participant.user_id,
                          );
                        });
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              ))
          )}
        </div>

        {isCommander ? (
          <form action={formAction} className="space-y-3 border-t border-border pt-4">
            <input type="hidden" name="incidentId" value={incidentId} />
            <div className="space-y-2">
              <Label htmlFor="userId">Add participant</Label>
              <select id="userId" name="userId" required className={selectClassName}>
                <option value="">Select member</option>
                {availableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incidentRole">Role</Label>
              <select
                id="incidentRole"
                name="incidentRole"
                defaultValue="responder"
                className={selectClassName}
              >
                {incidentRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <FormMessage error={state.error} success={state.success} />
            <Button type="submit" size="sm" disabled={isPending}>
              Add to war room
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
