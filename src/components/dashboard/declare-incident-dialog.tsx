"use client";

import { useActionState, useState, useTransition } from "react";

import { suggestSeverityDraftAction } from "@/app/actions/ai";
import { declareIncidentAction, type ActionState } from "@/app/actions/incidents";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormSelectField } from "@/components/ui/form-select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { severityLevels } from "@/schemas/incident";
import type { DefaultOrgSettings } from "@/schemas/organization";

const initialState: ActionState = {};

const severityOptions = severityLevels.map((level) => ({
  value: level,
  label: level.toUpperCase(),
}));

export function DeclareIncidentDialog({
  metadataFields = [],
}: {
  metadataFields?: DefaultOrgSettings["incidentMetadataFields"];
}) {
  const [state, formAction, isPending] = useActionState(
    declareIncidentAction,
    initialState,
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<(typeof severityLevels)[number]>("sev2");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [isSuggesting, startSuggest] = useTransition();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button">Declare incident</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Declare incident</DialogTitle>
          <DialogDescription>
            Start a new war room. The on-call commander will be auto-assigned when
            configured.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="Payment API outage"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="What is happening? Who is impacted?"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <FormSelectField
            id="severity"
            name="severity"
            label="Severity"
            options={severityOptions}
            value={severity}
            onValueChange={(value) =>
              setSeverity(value as (typeof severityLevels)[number])
            }
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSuggesting || title.trim().length < 3}
            onClick={() => {
              setSuggestError(null);
              startSuggest(async () => {
                const result = await suggestSeverityDraftAction(title, description);
                if (result.error) {
                  setSuggestError(result.error);
                  return;
                }
                setSuggestion(result.result ?? "");
                const match = result.result?.match(/sev[1-4]/i);
                if (match) {
                  setSeverity(match[0].toLowerCase() as (typeof severityLevels)[number]);
                }
              });
            }}
          >
            {isSuggesting ? "Suggesting…" : "Suggest severity"}
          </Button>
          {suggestError ? (
            <p className="text-sm text-destructive">{suggestError}</p>
          ) : null}
          {suggestion ? (
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-xs">
              {suggestion}
            </pre>
          ) : null}

          {(metadataFields ?? []).map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`metadata-${field.key}`}>{field.label}</Label>
              <Input
                id={`metadata-${field.key}`}
                name={`metadata.${field.key}`}
                placeholder={field.label}
              />
            </div>
          ))}

          <FormMessage error={state.error} success={state.success} />

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Declaring..." : "Open war room"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
