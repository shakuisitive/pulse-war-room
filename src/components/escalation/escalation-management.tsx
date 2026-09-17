"use client";

import { useActionState } from "react";

import { updateEscalationPolicyAction } from "@/app/actions/escalation";
import type { ActionState } from "@/app/actions/organization";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import type { Database } from "@/types/supabase";

type EscalationPolicy =
  Database["public"]["Tables"]["escalation_policies"]["Row"];

const initialState: ActionState = {};

export function EscalationManagement({
  policies,
}: {
  policies: EscalationPolicy[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escalation policies</h1>
        <p className="text-muted-foreground">
          SLA thresholds used by pg_cron to detect breaches and record escalation timeline events.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {policies.map((policy) => (
          <PolicyCard key={policy.id} policy={policy} />
        ))}
      </div>
    </div>
  );
}

function PolicyCard({ policy }: { policy: EscalationPolicy }) {
  const [state, action, isPending] = useActionState(
    updateEscalationPolicyAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="uppercase">{policy.severity}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <input type="hidden" name="policyId" value={policy.id} />
          <div className="space-y-2">
            <Label htmlFor={`ack-${policy.id}`}>Acknowledge within (minutes)</Label>
            <NumberInput
              id={`ack-${policy.id}`}
              name="acknowledgeThresholdMinutes"
              min={1}
              defaultValue={policy.acknowledge_threshold_minutes}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`resolve-${policy.id}`}>Resolve within (minutes)</Label>
            <NumberInput
              id={`resolve-${policy.id}`}
              name="resolveThresholdMinutes"
              min={1}
              defaultValue={policy.resolve_threshold_minutes}
              required
            />
          </div>
          <FormMessage error={state.error} success={state.success} />
          <Button type="submit" size="sm" disabled={isPending}>
            Save policy
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
