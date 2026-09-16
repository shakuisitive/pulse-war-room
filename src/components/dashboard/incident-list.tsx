"use client";

import Link from "next/link";

import { LiveSlaIndicator } from "@/components/incidents/live-sla-indicator";
import { RelativeTime } from "@/components/incidents/relative-time";
import { SeverityBadge } from "@/components/incidents/severity-badge";
import { StatusBadge } from "@/components/incidents/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtimeIncidents, type IncidentSummary } from "@/hooks/use-realtime-incidents";
import type { DefaultOrgSettings } from "@/schemas/organization";

export function IncidentList({
  orgId,
  initialIncidents,
  slaThresholds,
}: {
  orgId: string;
  initialIncidents: IncidentSummary[];
  slaThresholds: DefaultOrgSettings["slaThresholds"];
}) {
  const { incidents } = useRealtimeIncidents(orgId, initialIncidents);

  const openIncidents = incidents.filter((incident) => incident.status !== "resolved");
  const resolvedIncidents = incidents.filter(
    (incident) => incident.status === "resolved",
  );

  if (incidents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No incidents yet</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          When you declare an incident, it will appear here with live status updates.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <IncidentSection
        title="Active incidents"
        incidents={openIncidents}
        slaThresholds={slaThresholds}
        emptyMessage="No active incidents — everything is quiet."
      />
      <IncidentSection
        title="Resolved"
        incidents={resolvedIncidents}
        slaThresholds={slaThresholds}
        emptyMessage="No resolved incidents yet."
      />
    </div>
  );
}

function IncidentSection({
  title,
  incidents,
  slaThresholds,
  emptyMessage,
}: {
  title: string;
  incidents: IncidentSummary[];
  slaThresholds: DefaultOrgSettings["slaThresholds"];
  emptyMessage: string;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {incidents.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid gap-3">
          {incidents.map((incident) => {
            if (!incident.id || !incident.severity || !incident.status) {
              return null;
            }

            const declaredAt =
              incident.declared_at ??
              incident.created_at ??
              new Date(0).toISOString();

            return (
              <Link key={incident.id} href={`/incidents/${incident.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={incident.severity} />
                        <StatusBadge status={incident.status} />
                        <LiveSlaIndicator
                          severity={incident.severity}
                          status={incident.status}
                          declaredAt={declaredAt}
                          acknowledgedAt={incident.acknowledged_at}
                          resolvedAt={incident.resolved_at}
                          slaThresholds={slaThresholds}
                        />
                      </div>
                      <p className="font-medium text-foreground">{incident.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Commander: {incident.commander_name ?? "Unassigned"} ·{" "}
                        <RelativeTime dateIso={declaredAt} addSuffix />
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>{incident.open_task_count ?? 0} open tasks</p>
                      <p>{incident.participant_count ?? 0} participants</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
