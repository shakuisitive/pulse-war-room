"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type WarRoomPresenceMember = {
  userId: string;
  displayName: string;
  incidentRole: string;
  onlineAt: string;
};

type PresencePayload = WarRoomPresenceMember;

export function useWarRoomPresence(
  incidentId: string,
  currentUser: {
    userId: string;
    displayName: string;
    incidentRole: string;
  },
) {
  const [members, setMembers] = useState<WarRoomPresenceMember[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channelName = `war-room-presence:${incidentId}`;

    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUser.userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresencePayload>();
        const onlineMembers = Object.values(state)
          .flat()
          .map((presence) => ({
            userId: presence.userId,
            displayName: presence.displayName,
            incidentRole: presence.incidentRole,
            onlineAt: presence.onlineAt,
          }));

        setMembers(onlineMembers);
      })
      .subscribe(async (status) => {
        setIsSubscribed(status === "SUBSCRIBED");

        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: currentUser.userId,
            displayName: currentUser.displayName,
            incidentRole: currentUser.incidentRole,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    incidentId,
    currentUser.displayName,
    currentUser.incidentRole,
    currentUser.userId,
  ]);

  return { members, isSubscribed };
}
