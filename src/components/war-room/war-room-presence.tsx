"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWarRoomPresence } from "@/hooks/use-war-room-presence";

export function WarRoomPresence({
  incidentId,
  currentUser,
}: {
  incidentId: string;
  currentUser: {
    userId: string;
    displayName: string;
    incidentRole: string;
  };
}) {
  const { members, isSubscribed } = useWarRoomPresence(incidentId, currentUser);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          In war room {isSubscribed ? "· live" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one else is here yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-2 rounded-md border border-border px-2 py-1"
              >
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">
                    {member.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.displayName}</p>
                  <Badge variant="secondary" className="capitalize">
                    {member.incidentRole}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
