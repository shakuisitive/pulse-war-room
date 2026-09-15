"use client";

import { GitBranch } from "lucide-react";

import { signInWithOAuthAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function OAuthButtons() {
  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => signInWithOAuthAction("google")}
      >
        Continue with Google
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => signInWithOAuthAction("github")}
      >
        <GitBranch className="size-4" />
        Continue with GitHub
      </Button>
    </div>
  );
}
