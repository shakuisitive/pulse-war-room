"use client";

import { useActionState, useEffect, useState, useTransition } from "react";

import {
  enrollMfaAction,
  verifyMfaEnrollmentAction,
  type MfaActionState,
} from "@/app/actions/mfa";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: MfaActionState = {};

export function MfaSetup({ mfaEnabled }: { mfaEnabled: boolean }) {
  const [enrollState, setEnrollState] = useState<MfaActionState>({});
  const [verifyState, verifyAction, isVerifyPending] = useActionState(
    verifyMfaEnrollmentAction,
    initialState,
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (mfaEnabled) {
      return;
    }
  }, [mfaEnabled]);

  function handleEnroll() {
    startTransition(async () => {
      const result = await enrollMfaAction();
      setEnrollState(result);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Multi-factor authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mfaEnabled ? (
          <FormMessage success="MFA is enabled on your account." />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Add TOTP-based MFA using an authenticator app for an extra layer
              of security.
            </p>
            <Button type="button" onClick={handleEnroll} disabled={isPending}>
              {isPending ? "Generating…" : "Set up MFA"}
            </Button>
            <FormMessage error={enrollState.error} success={enrollState.success} />
            {enrollState.qrCode ? (
              <div
                className="overflow-hidden rounded-md border border-border bg-white p-4"
                dangerouslySetInnerHTML={{ __html: enrollState.qrCode }}
              />
            ) : null}
            {enrollState.factorId ? (
              <form action={verifyAction} className="space-y-4">
                <input type="hidden" name="factorId" value={enrollState.factorId} />
                <div className="space-y-2">
                  <Label htmlFor="code">Verification code</Label>
                  <Input
                    id="code"
                    name="code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </div>
                <FormMessage error={verifyState.error} />
                <Button disabled={isVerifyPending}>
                  {isVerifyPending ? "Verifying…" : "Verify and enable MFA"}
                </Button>
              </form>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
