import { redirect } from "next/navigation";

import { AppShell } from "@/components/dashboard/app-shell";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();

  if (!session) {
    redirect("/onboarding/create-org");
  }

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", session.userId)
    .eq("org_id", session.organization.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <AppShell
      orgId={session.organization.id}
      orgName={session.organization.name}
      currentUser={{
        userId: session.userId,
        displayName: session.profile.display_name,
        orgRole: session.profile.org_role,
      }}
      initialNotifications={notifications ?? []}
    >
      {children}
    </AppShell>
  );
}
