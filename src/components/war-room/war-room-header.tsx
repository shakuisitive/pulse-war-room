"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTransition } from "react";

import {
  updateIncidentSeverityAction,
  updateIncidentStatusAction,
} from "@/app/actions/incidents";
import { IncidentDuration } from "@/components/incidents/incident-duration";
import { LiveSlaIndicator } from "@/components/incidents/live-sla-indicator";
import { SeverityBadge } from "@/components/incidents/severity-badge";
import { StatusBadge } from "@/components/incidents/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getNextStatuses } from "@/lib/incidents/status-transitions";
import type { DefaultOrgSettings } from "@/schemas/organization";
import { severityLevels } from "@/schemas/incident";
import type { Database } from "@/types/supabase";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const nextStatuses = getNextStatuses(incident.status);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            <LiveSlaIndicator
              severity={incident.severity}
              status={incident.status}
              declaredAt={incident.declared_at}
              acknowledgedAt={incident.acknowledged_at}
              resolvedAt={incident.resolved_at}
              slaThresholds={slaThresholds}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{incident.title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {incident.description || "No description provided."}
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>
              Commander: <span className="text-foreground">{commanderName ?? "Unassigned"}</span>
            </span>
            <IncidentDuration
              declaredAt={incident.declared_at}
              resolvedAt={incident.resolved_at}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {incident.status === "resolved" ? (
            <Button asChild size="sm" variant="outline">
              <Link href={`/incidents/${incident.id}/post-mortem`}>Open post-mortem</Link>
            </Button>
          ) : null}
        {isCommander && !isReadOnly ? (
          <>
            <Select
              value={incident.severity}
              disabled={isPending}
              onValueChange={(value) => {
                startTransition(async () => {
                  const result = await updateIncidentSeverityAction(
                    incident.id,
                    value,
                  );
                  if (!result.error) {
                    void queryClient.invalidateQueries({
                      queryKey: ["incident", incident.id],
                    });
                    router.refresh();
                  }
                });
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severityLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {nextStatuses.map((status) => (
              <Button
                key={status}
                type="button"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await updateIncidentStatusAction(
                      incident.id,
                      status,
                    );
                    if (!result.error) {
                      void queryClient.invalidateQueries({
                        queryKey: ["incident", incident.id],
                      });
                      router.refresh();
                    }
                  });
                }}
              >
                Mark {status}
              </Button>
            ))}
          </>
        ) : null}
        </div>
      </div>
    </div>
  );
}
