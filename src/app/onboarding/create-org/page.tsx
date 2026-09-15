"use client";

import { useActionState } from "react";

import {
  createOrganizationAction,
  type ActionState,
} from "@/app/actions/organization";
import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export default function CreateOrgPage() {
  const [state, action, isPending] = useActionState(
    createOrganizationAction,
    initialState,
  );

  return (
    <AuthCard
      title="Create your organization"
      description="Set up the workspace your team will use for incident response."
    >
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Organization name</Label>
          <Input id="name" name="name" placeholder="Acme Ops" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">URL slug</Label>
          <Input
            id="slug"
            name="slug"
            placeholder="acme-ops"
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">Your display name</Label>
          <Input id="displayName" name="displayName" required />
        </div>
        <FormMessage error={state.error} success={state.success} />
        <Button className="w-full" disabled={isPending}>
          {isPending ? "Creating…" : "Create organization"}
        </Button>
      </form>
    </AuthCard>
  );
}
