import { redirect } from "next/navigation";

import { OnCallManagement } from "@/components/on-call/on-call-management";
import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function OnCallPage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  if (!isOrgAdmin(session.profile.org_role)) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">On-call rotations</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only organization admins can manage on-call rotations.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const [rotationsResult, slotsResult, membersResult] = await Promise.all([
    supabase
      .from("on_call_rotations")
      .select("*")
      .eq("org_id", session.organization.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("on_call_slots")
      .select("*, profile:profiles!on_call_slots_user_id_fkey(display_name)")
      .eq("org_id", session.organization.id)
      .order("start_time", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, display_name")
      .eq("org_id", session.organization.id)
      .eq("is_active", true)
      .order("display_name"),
  ]);

  return (
    <OnCallManagement
      rotations={rotationsResult.data ?? []}
      slots={slotsResult.data ?? []}
      members={membersResult.data ?? []}
    />
  );
}
