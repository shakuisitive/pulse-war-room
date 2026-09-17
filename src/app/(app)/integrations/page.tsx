import { redirect } from "next/navigation";

import { IntegrationsManagement } from "@/components/integrations/integrations-management";
import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function IntegrationsPage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  if (!isOrgAdmin(session.profile.org_role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: integrations } = await supabase
    .from("webhook_integrations")
    .select("*")
    .eq("org_id", session.organization.id)
    .order("created_at", { ascending: false });

  return <IntegrationsManagement integrations={integrations ?? []} />;
}
