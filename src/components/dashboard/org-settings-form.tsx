"use client";

import { useActionState } from "react";

import {
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
          <FormCheckbox
            id="requireMfa"
            name="requireMfa"
            label="Require MFA for all organization members"
            defaultChecked={initialValues.requireMfa}
            className="md:col-span-2"
          />
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
  );
}
