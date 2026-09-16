"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { subscribePostgresChanges } from "@/lib/realtime/postgres-changes-channel";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];

async function fetchIncident(incidentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("id", incidentId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function useRealtimeIncident(incidentId: string, initialData: Incident) {
  const queryClient = useQueryClient();
  const queryKey = ["incident", incidentId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchIncident(incidentId),
    initialData,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = subscribePostgresChanges(supabase, `incident:${incidentId}`, [
      {
        filter: {
          event: "UPDATE",
          schema: "public",
          table: "incidents",
          filter: `id=eq.${incidentId}`,
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
    incident: query.data ?? initialData,
    isLoading: query.isLoading,
  };
}
