import { redirect } from "next/navigation";

import { EscalationManagement } from "@/components/escalation/escalation-management";
import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function EscalationPage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  if (!isOrgAdmin(session.profile.org_role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: policies } = await supabase
    .from("escalation_policies")
    .select("*")
    .eq("org_id", session.organization.id)
    .order("severity", { ascending: true });

  return <EscalationManagement policies={policies ?? []} />;
}
