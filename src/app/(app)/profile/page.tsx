import { ProfileForm } from "@/components/dashboard/profile-form";
import { MfaSetup } from "@/components/auth/mfa-setup";
import { getSessionContext } from "@/lib/auth/session";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ mfa?: string }>;
}) {
  const session = await getSessionContext();
  const params = await searchParams;
  const preferences = session!.profile.notification_preferences as {
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your display name, notifications, and MFA settings.
        </p>
        {params.mfa === "required" ? (
          <p className="mt-3 rounded-md border border-border bg-muted px-3 py-2 text-sm">
            Your organization requires MFA. Enroll a TOTP authenticator below to continue.
          </p>
        ) : null}
      </div>

      <ProfileForm
        initialValues={{
          displayName: session!.profile.display_name,
          avatarUrl: session!.profile.avatar_url ?? "",
          notificationPreferences: {
            emailEnabled: preferences.emailEnabled ?? true,
            inAppEnabled: preferences.inAppEnabled ?? true,
          },
        }}
      />

      <MfaSetup mfaEnabled={params.mfa === "enabled"} />
    </div>
  );
}
