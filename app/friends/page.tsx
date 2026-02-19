import { FriendsView } from "@/components/friends/friends-view";
import { RequireAuth } from "@/components/layout/require-auth";

export default function FriendsPage() {
  return (
    <RequireAuth>
      <FriendsView />
    </RequireAuth>
  );
}
