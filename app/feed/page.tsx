import { FeedView } from "@/components/feed/feed-view";
import { RequireAuth } from "@/components/layout/require-auth";

export default function FeedPage() {
  return (
    <RequireAuth>
      <FeedView />
    </RequireAuth>
  );
}
