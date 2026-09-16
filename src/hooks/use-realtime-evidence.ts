"use client";

import { useEffect, useState } from "react";

import { subscribePostgresChanges } from "@/lib/realtime/postgres-changes-channel";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type Evidence = Database["public"]["Tables"]["evidence"]["Row"];

export function useRealtimeEvidence(
  incidentId: string,
  initialData: Evidence[],
) {
  const [evidence, setEvidence] = useState(initialData);

  useEffect(() => {
    setEvidence(initialData);
  }, [initialData]);

  useEffect(() => {
    const supabase = createClient();
    const channel = subscribePostgresChanges(supabase, `evidence:${incidentId}`, [
      {
        filter: {
          event: "INSERT",
          schema: "public",
          table: "evidence",
          filter: `incident_id=eq.${incidentId}`,
        },
        callback: (payload) => {
          const row = payload as { new: Evidence };
          setEvidence((current) =>
            current.some((item) => item.id === row.new.id)
              ? current
              : [...current, row.new],
          );
        },
      },
    ]);

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [incidentId]);

  return { evidence };
}
