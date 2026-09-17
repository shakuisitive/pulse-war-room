"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { subscribePostgresChanges } from "@/lib/realtime/postgres-changes-channel";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

async function fetchNotifications(userId: string, orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export function useRealtimeNotifications(
  userId: string,
  orgId: string,
  initialData: Notification[],
) {
  const queryClient = useQueryClient();
  const queryKey = ["notifications", userId, orgId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchNotifications(userId, orgId),
    initialData,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = subscribePostgresChanges(
      supabase,
      `notifications:${userId}`,
      [
        {
          filter: {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          callback: () => {
            void queryClient.invalidateQueries({ queryKey });
          },
        },
      ],
    );

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
  };
}
