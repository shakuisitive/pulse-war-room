"use client";

import { useActionState, useTransition } from "react";

import { createTaskAction, updateTaskAction, type ActionState } from "@/app/actions/incidents";
import { FormMessage } from "@/components/auth/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormSelectField,
  UNASSIGNED_SELECT_VALUE,
} from "@/components/ui/form-select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Task } from "@/hooks/use-realtime-tasks";
import { taskStatuses } from "@/schemas/incident";
import type { Database } from "@/types/supabase";

type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "display_name"
>;

const initialState: ActionState = {};

export function WarRoomTasks({
  incidentId,
  tasks,
  orgMembers,
  isCommander,
  currentUserId,
  canManageAssignedTasks,
}: {
  incidentId: string;
  tasks: Task[];
  orgMembers: Profile[];
  isCommander: boolean;
  currentUserId: string;
  canManageAssignedTasks: boolean;
}) {
  const [createState, createAction, isCreatePending] = useActionState(
    createTaskAction,
    initialState,
  );
  const [isPending, startTransition] = useTransition();

  const assigneeOptions = [
    { value: UNASSIGNED_SELECT_VALUE, label: "Unassigned" },
    ...orgMembers.map((member) => ({
      value: member.id,
      label: member.display_name,
    })),
  ];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {isCommander ? (
          <form action={createAction} className="space-y-3 rounded-md border border-border p-3">
            <input type="hidden" name="incidentId" value={incidentId} />
            <div className="space-y-2">
              <Label htmlFor="task-title">New task</Label>
              <Input id="task-title" name="title" required placeholder="Verify rollback" />
            </div>
            <FormSelectField
              id="assigneeId"
              name="assigneeId"
              label="Assign to"
              options={assigneeOptions}
              defaultValue={UNASSIGNED_SELECT_VALUE}
              mapValueToForm={(value) =>
                value === UNASSIGNED_SELECT_VALUE ? "" : value
              }
            />
            <FormMessage error={createState.error} success={createState.success} />
            <Button type="submit" size="sm" disabled={isCreatePending}>
              Add task
            </Button>
          </form>
        ) : null}

        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const canUpdate =
                isCommander ||
                (canManageAssignedTasks && task.assignee_id === currentUserId);

              return (
                <div
                  key={task.id}
                  className="rounded-md border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.assignee?.display_name ?? "Unassigned"}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {task.status.replaceAll("_", " ")}
                    </Badge>
                  </div>

                  {canUpdate ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {taskStatuses.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={task.status === status ? "default" : "outline"}
                          disabled={isPending}
                          onClick={() => {
                            startTransition(async () => {
                              await updateTaskAction(task.id, incidentId, {
                                status,
                              });
                            });
                          }}
                        >
                          {status.replaceAll("_", " ")}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
