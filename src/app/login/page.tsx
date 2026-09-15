import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const params = await searchParams;
  const message = params.message ?? params.error;

  return (
    <AuthCard
      title="Sign in to Pulse"
      description="Access your organization's incident response workspace."
    >
      <SignInForm message={message} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Pulse?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
