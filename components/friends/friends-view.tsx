"use client";

import { useAuth } from "@/components/layout/auth-provider";
import { FriendPanel } from "@/components/friends/friend-panel";

export function FriendsView() {
  const { user } = useAuth();

  if (!user) {
    return <p className="text-sm text-stamp-ink/70">Loading your account...</p>;
  }

  return (
    <section className="space-y-4">
      <header className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
        <h1 className="text-2xl font-semibold">Friends</h1>
        <p className="text-sm text-stamp-ink/75">Manage requests and friend connections without cluttering your feed.</p>
      </header>

      <FriendPanel
        currentUid={user.uid}
        onChanged={async () => {
          // realtime listeners handle updates; no manual refresh needed
        }}
      />
    </section>
  );
}
