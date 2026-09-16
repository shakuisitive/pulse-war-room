"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { subscribePostgresChanges } from "@/lib/realtime/postgres-changes-channel";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

export type TimelineEntry =
  Database["public"]["Tables"]["timeline_entries"]["Row"] & {
    actor?: { display_name: string | null } | null;
  };

async function fetchTimeline(incidentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("timeline_entries")
    .select("*, actor:profiles!timeline_entries_actor_id_fkey(display_name)")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export function useRealtimeTimeline(
  incidentId: string,
  initialData: TimelineEntry[],
) {
  const queryClient = useQueryClient();
  const queryKey = ["timeline", incidentId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTimeline(incidentId),
    initialData,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = subscribePostgresChanges(supabase, `timeline:${incidentId}`, [
      {
        filter: {
          event: "INSERT",
          schema: "public",
          table: "timeline_entries",
          filter: `incident_id=eq.${incidentId}`,
        },
        callback: () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      },
    ]);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [incidentId, queryClient]);

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
  };
}
