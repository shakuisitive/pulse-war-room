"use client";

import { useEffect, useState } from "react";

import { SlaIndicator } from "@/components/incidents/sla-indicator";
import { getSlaState, type SlaState } from "@/lib/incidents/sla";
import type { DefaultOrgSettings } from "@/schemas/organization";
import type { Database } from "@/types/supabase";

type Severity = Database["public"]["Enums"]["severity_level"];
type IncidentStatus = Database["public"]["Enums"]["incident_status"];

export function LiveSlaIndicator({
  severity,
  status,
  declaredAt,
  acknowledgedAt,
  resolvedAt,
  slaThresholds,
}: {
  severity: Severity;
  status: IncidentStatus;
  declaredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  slaThresholds: DefaultOrgSettings["slaThresholds"];
}) {
  const [state, setState] = useState<SlaState | null>(() =>
    resolvedAt
      ? getSlaState({
          severity,
          status,
          declaredAt,
          acknowledgedAt,
          resolvedAt,
          slaThresholds,
        })
      : null,
  );

  useEffect(() => {
    const update = () => {
      setState(
        getSlaState({
          severity,
          status,
          declaredAt,
          acknowledgedAt,
          resolvedAt,
          slaThresholds,
        }),
      );
    };

    update();

    if (resolvedAt) {
      return;
    }

    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [
    severity,
    status,
    declaredAt,
    acknowledgedAt,
    resolvedAt,
    slaThresholds,
  ]);

  if (!state) {
    return (
      <span className="inline-flex h-6 min-w-20 items-center rounded-md border border-border px-2 text-xs text-muted-foreground">
        SLA …
      </span>
    );
  }

  return <SlaIndicator state={state} />;
}
