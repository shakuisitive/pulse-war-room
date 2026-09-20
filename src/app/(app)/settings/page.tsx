import { redirect } from "next/navigation";

import { OrgSettingsForm } from "@/components/dashboard/org-settings-form";
import { getSessionContext, isOrgAdmin } from "@/lib/auth/session";
import { defaultOrgSettings, type OrgSettingsInput } from "@/schemas/organization";

export default async function SettingsPage() {
  const session = await getSessionContext();

  if (!session || !isOrgAdmin(session.profile.org_role)) {
    redirect("/dashboard");
  }

  const settings = {
    ...defaultOrgSettings,
    ...(session.organization.settings as Partial<OrgSettingsInput>),
    name: session.organization.name,
    slug: session.organization.slug,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization settings</h1>
        <p className="text-muted-foreground">
          Configure your org name, SLA thresholds, and security preferences.
        </p>
      </div>
      <OrgSettingsForm
        initialValues={settings}
        isOwner={session.profile.org_role === "owner"}
      />
    </div>
  );
}
