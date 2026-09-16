"use client";

import { useActionState } from "react";

import {
  updateProfileAction,
  type ActionState,
} from "@/app/actions/organization";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormCheckbox } from "@/components/ui/form-checkbox-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileInput } from "@/schemas/organization";

const initialState: ActionState = {};

export function ProfileForm({
  initialValues,
}: {
  initialValues: ProfileInput;
}) {
  const [state, action, isPending] = useActionState(
    updateProfileAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={initialValues.displayName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              name="avatarUrl"
              type="url"
              defaultValue={initialValues.avatarUrl}
              placeholder="https://"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Notifications</p>
            <FormCheckbox
              id="emailEnabled"
              name="emailEnabled"
              label="Email notifications"
              defaultChecked={
                initialValues.notificationPreferences.emailEnabled
              }
            />
            <FormCheckbox
              id="inAppEnabled"
              name="inAppEnabled"
              label="In-app notifications"
              defaultChecked={
                initialValues.notificationPreferences.inAppEnabled
              }
            />
          </div>
          <FormMessage error={state.error} success={state.success} />
          <Button disabled={isPending}>
            {isPending ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
