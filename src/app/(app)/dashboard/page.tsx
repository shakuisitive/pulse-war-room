import { Activity, ShieldCheck, Users } from "lucide-react";

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

export default async function DashboardPage() {
  const session = await getSessionContext();
  const supabase = await createClient();

  const { count: memberCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("org_id", session!.organization.id);

  const { count: openIncidentCount } = await supabase
    .from("incidents")
    .select("*", { count: "exact", head: true })
    .eq("org_id", session!.organization.id)
    .neq("status", "resolved");

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="secondary">Milestone 1</Badge>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Welcome back, {session!.profile.display_name}
        </h1>
        <p className="text-muted-foreground">
          Your organization is set up and ready for incident response.
        </p>
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
            <CardDescription>War rooms will appear here in Milestone 2</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Org isolation</CardTitle>
            <ShieldCheck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">RLS</p>
            <CardDescription>Database policies enforce tenant boundaries</CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
