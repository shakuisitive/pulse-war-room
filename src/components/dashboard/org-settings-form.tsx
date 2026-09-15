"use client";

import { useActionState } from "react";

import {
  updateOrgSettingsAction,
  type ActionState,
} from "@/app/actions/organization";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrgSettingsInput } from "@/schemas/organization";

const initialState: ActionState = {};

export function OrgSettingsForm({
  initialValues,
}: {
  initialValues: OrgSettingsInput;
}) {
  const [state, action, isPending] = useActionState(
    updateOrgSettingsAction,
    initialState,
  );

  return (
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
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              name="requireMfa"
              defaultChecked={initialValues.requireMfa}
              className="size-4 rounded border border-input"
            />
            Require MFA for all organization members
          </label>
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
                <Input
                  id={`${severity}Ack`}
                  name={`${severity}Ack`}
                  type="number"
                  min={1}
                  defaultValue={
                    initialValues.slaThresholds[severity].acknowledgeMinutes
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${severity}Resolve`}>Resolve within</Label>
                <Input
                  id={`${severity}Resolve`}
                  name={`${severity}Resolve`}
                  type="number"
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
  );
}
