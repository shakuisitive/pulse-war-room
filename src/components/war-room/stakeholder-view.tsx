"use client";

import { SeverityBadge } from "@/components/incidents/severity-badge";
import { StatusBadge } from "@/components/incidents/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/types/supabase";

type Incident = Database["public"]["Tables"]["incidents"]["Row"];
type TimelineEntry =
  Database["public"]["Tables"]["timeline_entries"]["Row"] & {
    actor?: { display_name: string | null } | null;
  };

export function StakeholderView({
  incident,
  commanderName,
  timelineEntries,
}: {
  incident: Incident;
  commanderName: string | null;
  timelineEntries: TimelineEntry[];
}) {
  const visibleTimeline = timelineEntries.filter(
    (entry) => entry.is_stakeholder_visible,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
          <CardTitle className="text-2xl">{incident.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Commander: {commanderName ?? "Unassigned"}
          </p>
          <p>{incident.description || "No description provided."}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stakeholder updates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleTimeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No stakeholder-visible updates yet.
            </p>
          ) : (
            visibleTimeline.map((entry) => (
              <div key={entry.id} className="rounded-md border border-border p-3">
                <p className="text-sm">{entry.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.actor?.display_name ?? "System"} ·{" "}
                  {new Date(entry.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
