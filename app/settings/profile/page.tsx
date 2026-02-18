import { RequireAuth } from "@/components/layout/require-auth";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";

export default function ProfileSettingsPage() {
  return (
    <RequireAuth>
      <ProfileSettingsForm />
    </RequireAuth>
  );
}
