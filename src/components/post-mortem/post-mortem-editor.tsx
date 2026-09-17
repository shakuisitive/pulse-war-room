"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  createActionItemAction,
  deleteActionItemAction,
  updateActionItemStatusAction,
} from "@/app/actions/action-items";
import type { ActionState } from "@/app/actions/organization";
import {
  applyAiDraftToPostMortemAction,
  publishPostMortemAction,
  savePostMortemAction,
} from "@/app/actions/post-mortem";
import { runAiIncidentAction } from "@/app/actions/ai";
import { FormMessage } from "@/components/auth/form-message";
import { SeverityBadge } from "@/components/incidents/severity-badge";
import { StatusBadge } from "@/components/incidents/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormCheckbox } from "@/components/ui/form-checkbox-field";
import {
  FormSelectField,
  UNASSIGNED_SELECT_VALUE,
} from "@/components/ui/form-select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { actionItemStatuses } from "@/schemas/action-item";
import type { Database } from "@/types/supabase";

type PostMortem = Database["public"]["Tables"]["post_mortems"]["Row"];
type ActionItem = Database["public"]["Tables"]["action_items"]["Row"];
type Incident = Database["public"]["Tables"]["incidents"]["Row"];
type Member = { id: string; display_name: string };

const initialState: ActionState = {};

const statusLabels: Record<(typeof actionItemStatuses)[number], string> = {
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
};

export function PostMortemEditor({
  incident,
  postMortem,
  actionItems,
  orgMembers,
  canEdit,
}: {
  incident: Incident;
  postMortem: PostMortem;
  actionItems: ActionItem[];
  orgMembers: Member[];
  canEdit: boolean;
}) {
  const [saveState, saveAction, isSavePending] = useActionState(
    savePostMortemAction,
    initialState,
  );
  const [publishState, publishAction, isPublishPending] = useActionState(
    publishPostMortemAction,
    initialState,
  );
  const [createItemState, createItemAction, isCreateItemPending] = useActionState(
    createActionItemAction,
    initialState,
  );
  const [isAiPending, startAiTransition] = useTransition();
  const [aiMessage, setAiMessage] = useState<ActionState>({});

  const memberOptions = orgMembers.map((member) => ({
    value: member.id,
    label: member.display_name,
  }));

  function runAiDraft() {
    startAiTransition(async () => {
      const response = await runAiIncidentAction(incident.id, "post-mortem-draft");
      if (response.error || !response.result) {
        setAiMessage({ error: response.error ?? "No draft returned." });
        return;
      }
      const applied = await applyAiDraftToPostMortemAction(
        postMortem.id,
        response.result,
      );
      setAiMessage(applied);
      if (applied.success) {
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
            {postMortem.is_published ? (
              <Badge variant="secondary">Published</Badge>
            ) : (
              <Badge variant="outline">Draft</Badge>
            )}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{incident.title}</h1>
          <p className="text-muted-foreground">Structured post-mortem for this incident.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/incidents/${incident.id}`}>Back to war room</Link>
          </Button>
          {canEdit && !postMortem.is_published ? (
            <Button disabled={isAiPending} onClick={runAiDraft} variant="outline">
              {isAiPending ? "Generating draft…" : "Generate AI draft"}
            </Button>
          ) : null}
        </div>
      </div>

      <FormMessage error={saveState.error} success={saveState.success} />
      <FormMessage error={publishState.error} success={publishState.success} />
      <FormMessage error={aiMessage.error} success={aiMessage.success} />
      <FormMessage error={createItemState.error} success={createItemState.success} />

      <form action={saveAction} className="space-y-6">
        <input name="postMortemId" type="hidden" value={postMortem.id} />

        {(
          [
            ["summary", "Executive summary", postMortem.summary],
            ["timelineNarrative", "Timeline narrative", postMortem.timeline_narrative],
            ["rootCause", "Root cause", postMortem.root_cause],
            ["contributingFactors", "Contributing factors", postMortem.contributing_factors],
            ["lessonsLearned", "Lessons learned", postMortem.lessons_learned],
          ] as const
        ).map(([name, label, value]) => (
          <Card key={name}>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Label className="sr-only" htmlFor={name}>
                {label}
              </Label>
              <Textarea
                id={name}
                name={name}
                defaultValue={value}
                readOnly={!canEdit || postMortem.is_published}
                rows={6}
              />
            </CardContent>
          </Card>
        ))}

        {canEdit && !postMortem.is_published ? (
          <Button disabled={isSavePending} type="submit">
            {isSavePending ? "Saving…" : "Save draft"}
          </Button>
        ) : null}
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Follow-up action items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No action items yet.</p>
          ) : (
            <div className="space-y-3">
              {actionItems.map((item) => {
                const isOverdue =
                  item.due_at &&
                  item.status !== "completed" &&
                  new Date(item.due_at) < new Date();

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-md border border-border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.description ? (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.due_at
                          ? `Due ${new Date(item.due_at).toLocaleDateString()}`
                          : "No due date"}
                        {isOverdue ? " · Overdue" : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={isOverdue ? "destructive" : "secondary"}>
                        {statusLabels[item.status]}
                      </Badge>
                      {canEdit && !postMortem.is_published ? (
                        <>
                          {actionItemStatuses.map((status) => (
                            <Button
                              key={status}
                              size="sm"
                              variant={item.status === status ? "default" : "outline"}
                              onClick={() =>
                                void updateActionItemStatusAction(item.id, status)
                              }
                            >
                              {statusLabels[status]}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void deleteActionItemAction(item.id)}
                          >
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {canEdit && !postMortem.is_published ? (
            <form action={createItemAction} className="grid gap-4 md:grid-cols-2">
              <input name="postMortemId" type="hidden" value={postMortem.id} />
              <input name="incidentId" type="hidden" value={incident.id} />
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" rows={3} />
              </div>
              <FormSelectField
                id="assigneeId"
                label="Assignee"
                name="assigneeId"
                placeholder="Unassigned"
                options={[
                  { value: UNASSIGNED_SELECT_VALUE, label: "Unassigned" },
                  ...memberOptions,
                ]}
                mapValueToForm={(value) =>
                  value === UNASSIGNED_SELECT_VALUE ? "" : value
                }
              />
              <div className="space-y-2">
                <Label htmlFor="dueAt">Due date</Label>
                <Input id="dueAt" name="dueAt" type="date" />
              </div>
              <div className="md:col-span-2">
                <Button disabled={isCreateItemPending} type="submit">
                  {isCreateItemPending ? "Adding…" : "Add action item"}
                </Button>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {canEdit && !postMortem.is_published ? (
        <Card>
          <CardHeader>
            <CardTitle>Publish</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={publishAction} className="space-y-4">
              <input name="postMortemId" type="hidden" value={postMortem.id} />
              <FormCheckbox
                id="isStakeholderVisible"
                label="Visible to stakeholders"
                name="isStakeholderVisible"
              />
              <p className="text-sm text-muted-foreground">
                Allow invited stakeholders to read this post-mortem.
              </p>
              <Button disabled={isPublishPending} type="submit">
                {isPublishPending ? "Publishing…" : "Publish post-mortem"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
