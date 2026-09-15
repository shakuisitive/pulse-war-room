"use client";

import { useActionState } from "react";

import { resetPasswordAction, type AuthActionState } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export default function ResetPasswordPage() {
  const [state, action, isPending] = useActionState(
    resetPasswordAction,
    initialState,
  );

  return (
    <AuthCard
      title="Choose a new password"
      description="Enter and confirm your new password."
    >
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
          />
        </div>
        <FormMessage error={state.error} success={state.success} />
        <Button className="w-full" disabled={isPending}>
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
