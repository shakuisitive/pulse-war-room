import { AuditLogViewer } from "@/components/audit-log/audit-log-viewer";
import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AuditLogPage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  if (!isOrgAdmin(session.profile.org_role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("org_id", session.organization.id)
    .eq("is_active", true)
    .order("display_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground">
          Admin-only history of mutations across your organization.
        </p>
      </div>
      <AuditLogViewer members={members ?? []} />
    </div>
  );
}
