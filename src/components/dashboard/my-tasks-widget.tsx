import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/types/supabase";

type Task = Pick<
  Database["public"]["Tables"]["tasks"]["Row"],
  "id" | "title" | "status" | "due_at" | "incident_id"
>;

export function MyTasksWidget({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My war room tasks</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No open tasks assigned to you.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My war room tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => {
          const isOverdue =
            task.due_at &&
            task.status !== "completed" &&
            new Date(task.due_at) < new Date();

          return (
            <div
              key={task.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div>
                <Link
                  href={`/incidents/${task.incident_id}`}
                  className="font-medium hover:underline"
                >
                  {task.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {task.due_at
                    ? `Due ${new Date(task.due_at).toLocaleString()}`
                    : "No due time"}
                </p>
              </div>
              <Badge variant={isOverdue ? "destructive" : "secondary"}>
                {isOverdue ? "Overdue" : task.status.replaceAll("_", " ")}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
