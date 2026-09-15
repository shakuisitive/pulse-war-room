import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthCard
      title="Create your Pulse account"
      description="Start coordinating incidents with your team."
    >
      <SignUpForm />
    </AuthCard>
  );
}
