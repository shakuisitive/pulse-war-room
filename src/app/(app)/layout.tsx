import { redirect } from "next/navigation";

import { AppShell } from "@/components/dashboard/app-shell";
import { getSessionContext } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();

  if (!session) {
    redirect("/onboarding/create-org");
  }

  return (
    <AppShell
      orgId={session.organization.id}
      orgName={session.organization.name}
      currentUser={{
        userId: session.userId,
        displayName: session.profile.display_name,
        orgRole: session.profile.org_role,
      }}
    >
      {children}
    </AppShell>
  );
}
