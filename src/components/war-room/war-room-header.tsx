"use client";

import { useTransition } from "react";

import {
  updateIncidentSeverityAction,
  updateIncidentStatusAction,
} from "@/app/actions/incidents";
import { SeverityBadge } from "@/components/incidents/severity-badge";
import { SlaIndicator } from "@/components/incidents/sla-indicator";
import { StatusBadge } from "@/components/incidents/status-badge";
import { Button } from "@/components/ui/button";
import { formatDuration, getSlaState } from "@/lib/incidents/sla";
import { getNextStatuses } from "@/lib/incidents/status-transitions";
import type { DefaultOrgSettings } from "@/schemas/organization";
import { severityLevels } from "@/schemas/incident";
import type { Database } from "@/types/supabase";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];

const selectClassName =
  "flex h-9 rounded-md border border-input bg-input px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function WarRoomHeader({
  incident,
  commanderName,
  slaThresholds,
  isCommander,
  isReadOnly,
}: {
  incident: Incident;
  commanderName: string | null;
  slaThresholds: DefaultOrgSettings["slaThresholds"];
  isCommander: boolean;
  isReadOnly: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const slaState = getSlaState({
    severity: incident.severity,
    status: incident.status,
    declaredAt: incident.declared_at,
    acknowledgedAt: incident.acknowledged_at,
    resolvedAt: incident.resolved_at,
    slaThresholds,
  });

  const nextStatuses = getNextStatuses(incident.status);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            <SlaIndicator state={slaState} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {incident.description || "No description provided."}
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              Commander: <span className="text-foreground">{commanderName ?? "Unassigned"}</span>
            </span>
            <span className="font-mono">
              Open for {formatDuration(incident.declared_at, incident.resolved_at)}
            </span>
          </div>
        </div>

        {isCommander && !isReadOnly ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className={selectClassName}
              value={incident.severity}
              disabled={isPending}
              onChange={(event) => {
                startTransition(async () => {
                  await updateIncidentSeverityAction(
                    incident.id,
                    event.target.value,
                  );
                });
              }}
            >
              {severityLevels.map((level) => (
                <option key={level} value={level}>
                  {level.toUpperCase()}
                </option>
              ))}
            </select>

            {nextStatuses.map((status) => (
              <Button
                key={status}
                size="sm"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await updateIncidentStatusAction(incident.id, status);
                  });
                }}
              >
                Mark {status}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
