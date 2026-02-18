import { RequireAuth } from "@/components/layout/require-auth";
import { NotificationCenter } from "@/components/notifications/notification-center";

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationCenter />
    </RequireAuth>
  );
}
