"use client";

import { useActionState } from "react";

import { verifyMfaLoginAction, type MfaActionState } from "@/app/actions/mfa";
import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: MfaActionState = {};

export default function MfaVerifyPage() {
  const [state, action, isPending] = useActionState(
    verifyMfaLoginAction,
    initialState,
  );

  return (
    <AuthCard
      title="Verify MFA"
      description="Enter the 6-digit code from your authenticator app."
    >
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Authentication code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
          />
        </div>
        <FormMessage error={state.error} />
        <Button className="w-full" disabled={isPending}>
          {isPending ? "Verifying…" : "Continue"}
        </Button>
      </form>
    </AuthCard>
  );
}
