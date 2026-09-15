import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { TeamManagement } from "@/components/dashboard/team-management";

export default async function TeamPage() {
  const session = await getSessionContext();
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("profiles")
    .select("id, display_name, org_role, avatar_url, is_active, created_at")
    .eq("org_id", session!.organization.id)
    .order("created_at", { ascending: true });

  return (
    <TeamManagement
      members={members ?? []}
      canManage={isOrgAdmin(session!.profile.org_role)}
      currentUserId={session!.userId}
    />
  );
}
