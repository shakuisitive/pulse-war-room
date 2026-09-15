"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  signInAction,
  signInWithMagicLinkAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { FormMessage } from "@/components/auth/form-message";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const initialState: AuthActionState = {};

export function SignInForm({ message }: { message?: string }) {
  const [passwordState, passwordAction, isPasswordPending] = useActionState(
    signInAction,
    initialState,
  );
  const [magicState, magicAction, isMagicPending] = useActionState(
    signInWithMagicLinkAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      {message ? <FormMessage success={message} /> : null}

      <Tabs defaultValue="password">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="magic">Magic link</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="space-y-4 pt-4">
          <form action={passwordAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <FormMessage
              error={passwordState.error}
              success={passwordState.success}
            />
            <Button className="w-full" disabled={isPasswordPending}>
              {isPasswordPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="magic" className="space-y-4 pt-4">
          <form action={magicAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="magic-email">Email</Label>
              <Input id="magic-email" name="email" type="email" required />
            </div>
            <FormMessage error={magicState.error} success={magicState.success} />
            <Button className="w-full" disabled={isMagicPending}>
              {isMagicPending ? "Sending…" : "Send magic link"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <Separator />

      <OAuthButtons />

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
      </p>
    </div>
  );
}
