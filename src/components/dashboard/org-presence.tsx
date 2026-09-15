"use client";

import { useOrgPresence } from "@/hooks/use-org-presence";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function OrgPresence({
  orgId,
  currentUser,
}: {
  orgId: string;
  currentUser: { userId: string; displayName: string; orgRole: string };
}) {
  const { members, isSubscribed } = useOrgPresence(orgId, currentUser);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Online now</h3>
        <Badge variant={isSubscribed ? "secondary" : "outline"}>
          {isSubscribed ? `${members.length} online` : "Connecting…"}
        </Badge>
      </div>
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No teammates online.</p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3">
              <span className="relative">
                <Avatar className="size-8">
                  <AvatarFallback>
                    {member.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-card" />
              </span>
              <div>
                <p className="text-sm font-medium">{member.displayName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {member.orgRole}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
