import { Activity, ShieldCheck, Users } from "lucide-react";

import { DeclareIncidentDialog } from "@/components/dashboard/declare-incident-dialog";
import { IncidentList } from "@/components/dashboard/incident-list";
import { IncidentSearch } from "@/components/dashboard/incident-search";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { defaultOrgSettings, type OrgSettingsInput } from "@/schemas/organization";

export default async function DashboardPage() {
  const session = await getSessionContext();
  const supabase = await createClient();

  const settings = {
    ...defaultOrgSettings,
    ...(session!.organization.settings as Partial<OrgSettingsInput>),
  };

  const [{ count: memberCount }, { count: openIncidentCount }, { data: incidents }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("org_id", session!.organization.id),
      supabase
        .from("incidents")
        .select("*", { count: "exact", head: true })
        .eq("org_id", session!.organization.id)
        .neq("status", "resolved"),
      supabase
        .from("incident_summary_view")
        .select("*")
        .eq("org_id", session!.organization.id)
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Badge variant="secondary">Milestone 3</Badge>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Welcome back, {session!.profile.display_name}
          </h1>
          <p className="text-muted-foreground">
            Monitor active incidents and open war rooms in real time.
          </p>
        </div>
        <DeclareIncidentDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team members</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{memberCount ?? 0}</p>
            <CardDescription>Members in {session!.organization.name}</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active incidents</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{openIncidentCount ?? 0}</p>
            <CardDescription>Open war rooms in your organization</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Org isolation</CardTitle>
            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">RLS</p>
            <CardDescription>Incident-level policies enforce war room access</CardDescription>
          </CardContent>
        </Card>
      </div>

      <IncidentSearch />

      <IncidentList
        orgId={session!.organization.id}
        initialIncidents={incidents ?? []}
        slaThresholds={settings.slaThresholds}
      />
    </div>
  );
}
