"use client";

import { useActionState, useTransition } from "react";

import {
  createIntegrationAction,
  deleteIntegrationAction,
  testIntegrationAction,
  updateIntegrationAction,
} from "@/app/actions/integrations";
import type { ActionState } from "@/app/actions/organization";
import { FormMessage } from "@/components/auth/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormCheckbox } from "@/components/ui/form-checkbox-field";
import { FormSelectField } from "@/components/ui/form-select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWebhookUrl } from "@/lib/integrations/webhook-url";
import { severityLevels } from "@/schemas/incident";
import type { Database } from "@/types/supabase";

type Integration = Database["public"]["Tables"]["webhook_integrations"]["Row"];

const initialState: ActionState = {};

const severityOptions = severityLevels.map((level) => ({
  value: level,
  label: level.toUpperCase(),
}));

export function IntegrationsManagement({
  integrations,
}: {
  integrations: Integration[];
}) {
  const [createState, createAction, isCreatePending] = useActionState(
    createIntegrationAction,
    initialState,
  );
  const [isUpdating, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Generate webhook URLs for external monitoring tools to auto-create incidents.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create integration</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Datadog alerts" />
            </div>
            <FormSelectField
              id="defaultSeverity"
              name="defaultSeverity"
              label="Default severity"
              options={severityOptions}
              defaultValue="sev3"
            />
            <div className="space-y-2">
              <Label htmlFor="titleField">Payload title field</Label>
              <Input id="titleField" name="titleField" placeholder="title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descriptionField">Payload description field</Label>
              <Input id="descriptionField" name="descriptionField" placeholder="description" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="severityField">Payload severity field</Label>
              <Input id="severityField" name="severityField" placeholder="severity" />
            </div>
            <div className="md:col-span-2">
              <FormMessage error={createState.error} success={createState.success} />
              <Button type="submit" disabled={isCreatePending}>
                Create integration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            No integrations yet.
          </CardContent>
        </Card>
      ) : (
        integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            isUpdating={isUpdating}
            onDelete={() => {
              startTransition(async () => {
                await deleteIntegrationAction(integration.id);
              });
            }}
            onTest={() => {
              startTransition(async () => {
                await testIntegrationAction(integration.id);
              });
            }}
          />
        ))
      )}
    </div>
  );
}

function IntegrationCard({
  integration,
  isUpdating,
  onDelete,
  onTest,
}: {
  integration: Integration;
  isUpdating: boolean;
  onDelete: () => void;
  onTest: () => void;
}) {
  const mapping =
    (integration.payload_mapping as Record<string, string> | null) ?? {};
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateIntegrationAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <CardTitle>{integration.name}</CardTitle>
          <div className="flex gap-2">
            {integration.is_active ? (
              <Badge>Active</Badge>
            ) : (
              <Badge variant="outline">Inactive</Badge>
            )}
          </div>
          <p className="font-mono text-xs text-muted-foreground break-all">
            {getWebhookUrl(integration.endpoint_slug)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={isUpdating} onClick={onTest}>
            Test webhook
          </Button>
          <Button size="sm" variant="outline" disabled={isUpdating} onClick={onDelete}>
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form action={updateAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="integrationId" value={integration.id} />
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`name-${integration.id}`}>Name</Label>
            <Input
              id={`name-${integration.id}`}
              name="name"
              defaultValue={integration.name}
              required
            />
          </div>
          <FormSelectField
            id={`severity-${integration.id}`}
            name="defaultSeverity"
            label="Default severity"
            options={severityOptions}
            defaultValue={integration.default_severity}
          />
          <FormCheckbox
            id={`active-${integration.id}`}
            name="isActive"
            label="Active"
            defaultChecked={integration.is_active}
          />
          <div className="space-y-2">
            <Label htmlFor={`title-${integration.id}`}>Title field</Label>
            <Input
              id={`title-${integration.id}`}
              name="titleField"
              defaultValue={mapping.title ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`desc-${integration.id}`}>Description field</Label>
            <Input
              id={`desc-${integration.id}`}
              name="descriptionField"
              defaultValue={mapping.description ?? ""}
            />
          </div>
          <div className="md:col-span-2">
            <FormMessage error={updateState.error} success={updateState.success} />
            <Button type="submit" size="sm" disabled={isUpdatePending}>
              Save integration
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
