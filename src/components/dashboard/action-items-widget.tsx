"use client";

import Link from "next/link";
import { useTransition } from "react";

import { updateActionItemStatusAction } from "@/app/actions/action-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/types/supabase";

type ActionItem = Database["public"]["Tables"]["action_items"]["Row"];

export function ActionItemsWidget({ items }: { items: ActionItem[] }) {
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My action items</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No open follow-ups assigned to you.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My action items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const isOverdue =
            item.due_at &&
            item.status !== "completed" &&
            new Date(item.due_at) < new Date();

          return (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.due_at
                    ? `Due ${new Date(item.due_at).toLocaleDateString()}`
                    : "No due date"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isOverdue ? "destructive" : "secondary"}>
                  {item.status.replace("_", " ")}
                </Badge>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/incidents/${item.incident_id}/post-mortem`}>View</Link>
                </Button>
                {item.status !== "completed" ? (
                  <Button
                    disabled={isPending}
                    size="sm"
                    onClick={() =>
                      startTransition(async () => {
                        await updateActionItemStatusAction(item.id, "completed");
                      })
                    }
                  >
                    Complete
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
