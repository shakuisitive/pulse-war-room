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
