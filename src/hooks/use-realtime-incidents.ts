"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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
  const queryKey = ["incidents", orgId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchIncidents(orgId),
    initialData,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`incidents:${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incidents",
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  return {
    incidents: query.data ?? [],
    isLoading: query.isLoading,
    isSubscribed: query.isFetched,
  };
}
