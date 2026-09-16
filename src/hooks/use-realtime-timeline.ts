"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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
  const queryKey = ["timeline", incidentId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTimeline(incidentId),
    initialData,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`timeline:${incidentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "timeline_entries",
          filter: `incident_id=eq.${incidentId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidentId, queryClient]);

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
  };
}
