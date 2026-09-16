"use client";

import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimelineEntry } from "@/hooks/use-realtime-timeline";

export function WarRoomTimeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Timeline entries will appear as the incident evolves.
          </p>
        ) : (
          entries.map((entry) => (
            <article
              key={entry.id}
              className="border-l-2 border-primary/40 pl-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <time className="font-mono">
                  {format(new Date(entry.created_at), "HH:mm:ss")}
                </time>
                <span className="uppercase tracking-wide">
                  {entry.entry_type.replaceAll("_", " ")}
                </span>
                {entry.actor?.display_name ? (
                  <span>· {entry.actor.display_name}</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-foreground">{entry.content}</p>
            </article>
          ))
        )}
      </CardContent>
    </Card>
  );
}
