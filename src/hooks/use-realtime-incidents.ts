"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { subscribePostgresChanges } from "@/lib/realtime/postgres-changes-channel";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

export type IncidentSummary =
  Database["public"]["Views"]["incident_summary_view"]["Row"];

async function fetchIncidents(orgId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("incident_summary_view")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export function useRealtimeIncidents(orgId: string, initialData: IncidentSummary[]) {
  const queryClient = useQueryClient();
  const queryKey = ["incidents", orgId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchIncidents(orgId),
    initialData,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = subscribePostgresChanges(supabase, `incidents:${orgId}`, [
      {
        filter: {
          event: "*",
          schema: "public",
          table: "incidents",
          filter: `org_id=eq.${orgId}`,
        },
        callback: () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      },
    ]);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  return {
    incidents: query.data ?? [],
    isLoading: query.isLoading,
    isSubscribed: query.isFetched,
  };
}
