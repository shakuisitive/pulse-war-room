"use client";

import Link from "next/link";

import { SeverityBadge } from "@/components/incidents/severity-badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Database } from "@/types/supabase";

type ArchiveRow = Database["public"]["Views"]["post_mortem_archive_view"]["Row"];

export function PostMortemArchive({ items }: { items: ArchiveRow[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          No published post-mortems yet. Publish one from a resolved incident.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        if (!item.id || !item.incident_id) {
          return null;
        }

        return (
          <Link key={item.id} href={`/incidents/${item.incident_id}/post-mortem`}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {item.severity ? <SeverityBadge severity={item.severity} /> : null}
                  {item.published_at ? (
                    <span className="text-xs text-muted-foreground">
                      Published {new Date(item.published_at).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
                <p className="font-medium">{item.incident_title}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {item.summary || "No summary provided."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Author: {item.author_name ?? "Unknown"}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
