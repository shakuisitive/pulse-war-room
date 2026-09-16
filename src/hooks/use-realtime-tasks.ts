"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

export type Task = Database["public"]["Tables"]["tasks"]["Row"] & {
  assignee?: { display_name: string | null } | null;
};

async function fetchTasks(incidentId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assignee_id_fkey(display_name)")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export function useRealtimeTasks(incidentId: string, initialData: Task[]) {
  const queryClient = useQueryClient();
  const queryKey = ["tasks", incidentId];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTasks(incidentId),
    initialData,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tasks:${incidentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
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
    tasks: query.data ?? [],
    isLoading: query.isLoading,
  };
}
