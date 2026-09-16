"use client";

import { useEffect, useState } from "react";

import { dedupePresenceMembers } from "@/lib/realtime/dedupe-presence-members";
import { removeExistingChannel } from "@/lib/realtime/postgres-changes-channel";
import { createClient } from "@/lib/supabase/client";

export type PresenceMember = {
  userId: string;
  displayName: string;
  orgRole: string;
  onlineAt: string;
};

type PresencePayload = {
  userId: string;
  displayName: string;
  orgRole: string;
  onlineAt: string;
};

export function useOrgPresence(
  orgId: string,
  currentUser: { userId: string; displayName: string; orgRole: string },
) {
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channelName = `org-presence:${orgId}`;
    removeExistingChannel(supabase, channelName);

    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUser.userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePayload>();
        const onlineMembers = dedupePresenceMembers(
          Object.values(state)
            .flat()
            .map((presence) => ({
              userId: presence.userId,
              displayName: presence.displayName,
              orgRole: presence.orgRole,
              onlineAt: presence.onlineAt,
            })),
        );

        setMembers(onlineMembers);
      })
      .subscribe(async (status) => {
        setIsSubscribed(status === "SUBSCRIBED");

        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: currentUser.userId,
            displayName: currentUser.displayName,
            orgRole: currentUser.orgRole,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, currentUser.displayName, currentUser.orgRole, currentUser.userId]);

  return { members, isSubscribed };
}
