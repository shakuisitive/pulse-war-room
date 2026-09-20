"use client";

import { useActionState } from "react";

import {
  deleteOrganizationAction,
  updateOrgSettingsAction,
  type ActionState,
} from "@/app/actions/organization";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormCheckbox } from "@/components/ui/form-checkbox-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import type { OrgSettingsInput } from "@/schemas/organization";

const initialState: ActionState = {};

export function OrgSettingsForm({
  initialValues,
  isOwner,
}: {
  initialValues: OrgSettingsInput;
  isOwner: boolean;
}) {
  const [state, action, isPending] = useActionState(
    updateOrgSettingsAction,
    initialState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteOrganizationAction,
    initialState,
  );

  return (
    <div className="space-y-6">
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={initialValues.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={initialValues.slug}
              required
            />
          </div>
          <FormCheckbox
            id="requireMfa"
            name="requireMfa"
            label="Require MFA for all organization members"
            defaultChecked={initialValues.requireMfa}
            className="md:col-span-2"
          />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="incidentMetadataFields">
              Custom incident fields (one per line: key|Label)
            </Label>
            <Textarea
              id="incidentMetadataFields"
              name="incidentMetadataFields"
              rows={4}
              defaultValue={(initialValues.incidentMetadataFields ?? [])
                .map((field) => `${field.key}|${field.label}`)
                .join("\n")}
              placeholder={"affected_service|Affected service"}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SLA thresholds (minutes)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(["sev1", "sev2", "sev3", "sev4"] as const).map((severity) => (
            <div key={severity} className="space-y-3 rounded-lg border border-border p-4">
              <p className="font-medium uppercase">{severity}</p>
              <div className="space-y-2">
                <Label htmlFor={`${severity}Ack`}>Acknowledge within</Label>
                <NumberInput
                  id={`${severity}Ack`}
                  name={`${severity}Ack`}
                  min={1}
                  defaultValue={
                    initialValues.slaThresholds[severity].acknowledgeMinutes
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${severity}Resolve`}>Resolve within</Label>
                <NumberInput
                  id={`${severity}Resolve`}
                  name={`${severity}Resolve`}
                  min={1}
                  defaultValue={
                    initialValues.slaThresholds[severity].resolveMinutes
                  }
                  required
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <FormMessage error={state.error} success={state.success} />
      <Button disabled={isPending}>
        {isPending ? "Saving…" : "Save settings"}
      </Button>
    </form>

      {isOwner ? (
        <form action={deleteAction} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delete organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This permanently deletes the organization and all of its incidents.
                Type <span className="font-mono text-foreground">{initialValues.slug}</span> to confirm.
              </p>
              <div className="space-y-2">
                <Label htmlFor="confirmSlug">Organization slug</Label>
                <Input id="confirmSlug" name="confirmSlug" required />
              </div>
              <FormMessage error={deleteState.error} success={deleteState.success} />
              <Button type="submit" variant="destructive" disabled={isDeleting}>
                {isDeleting ? "Deleting…" : "Delete organization"}
              </Button>
            </CardContent>
          </Card>
        </form>
      ) : null}
    </div>
  );
}
