"use client";

import Link from "next/link";
import { useActionState } from "react";

import { forgotPasswordAction, type AuthActionState } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";
import { FormMessage } from "@/components/auth/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export default function ForgotPasswordPage() {
  const [state, action, isPending] = useActionState(
    forgotPasswordAction,
    initialState,
  );

  return (
    <AuthCard
      title="Reset your password"
      description="We'll email you a link to choose a new password."
    >
      <form action={action} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <FormMessage error={state.error} success={state.success} />
        <Button className="w-full" disabled={isPending}>
          {isPending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
