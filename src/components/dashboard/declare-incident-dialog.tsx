"use client";

import { useActionState } from "react";

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

const initialState: ActionState = {};

const severityOptions = severityLevels.map((level) => ({
  value: level,
  label: level.toUpperCase(),
}));

export function DeclareIncidentDialog() {
  const [state, formAction, isPending] = useActionState(
    declareIncidentAction,
    initialState,
  );

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
            <Input id="title" name="title" required placeholder="Payment API outage" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="What is happening? Who is impacted?"
            />
          </div>

          <FormSelectField
            id="severity"
            name="severity"
            label="Severity"
            options={severityOptions}
            defaultValue="sev2"
          />

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
