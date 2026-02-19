"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import {
  markNotificationRead,
  subscribeToNotificationsForUser
} from "@/lib/services/notification-service";
import { getUserProfile } from "@/lib/services/profile-service";
import type { NotificationItem, WithId } from "@/lib/types/db";
import { formatTimestamp } from "@/lib/utils/dates";

type NotificationWithActor = WithId<NotificationItem> & {
  actorAddress?: string;
  actorDisplayName?: string;
};

export function NotificationCenter() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError("");

    return subscribeToNotificationsForUser(user.uid, (rawItems) => {
      void (async () => {
        try {
          const actorProfiles = await Promise.all(rawItems.map((item) => getUserProfile(item.actorUid)));

          setItems(
            rawItems.map((item, index) => ({
              ...item,
              actorAddress: actorProfiles[index]?.address,
              actorDisplayName: actorProfiles[index]?.displayName
            }))
          );
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Could not load notifications.");
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <section className="space-y-4">
      <header className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-stamp-ink/75">Unread: {unreadCount}</p>
      </header>

      {loading ? <p className="text-sm text-stamp-ink/70">Loading notifications...</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <div className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
          <p className="text-sm text-stamp-ink/75">No notifications yet.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => (
          <article
            className={`rounded-postcard border p-4 shadow-postcard ${
              item.read ? "border-stamp-muted bg-white" : "border-stamp-accent/40 bg-[#fff6ee]"
            }`}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm">
                  {item.type === "post_liked"
                    ? `${item.actorDisplayName ?? "Someone"} (${item.actorAddress ? `@${item.actorAddress}` : "unknown"}) liked one of your postcards.`
                    : item.type === "friend_request_received"
                      ? `${item.actorDisplayName ?? "Someone"} (${item.actorAddress ? `@${item.actorAddress}` : "unknown"}) sent you a friend request.`
                      : `${item.actorDisplayName ?? "Someone"} (${item.actorAddress ? `@${item.actorAddress}` : "unknown"}) accepted your friend request.`}
                </p>
                <p className="text-xs text-stamp-ink/65">{formatTimestamp(item.createdAt)}</p>
              </div>
              {!item.read ? (
                <button
                  className="rounded border border-stamp-muted px-2 py-1 text-xs hover:bg-stamp-muted"
                  onClick={() => {
                    void markNotificationRead(item.id);
                  }}
                  type="button"
                >
                  Mark read
                </button>
              ) : null}
            </div>

            <p className="mt-2 flex gap-3 text-xs">
              {item.type === "post_liked" ? <Link href={`/post/${item.postId}`}>View postcard</Link> : null}
              {item.actorAddress ? <Link href={`/profile/${item.actorAddress}`}>View their profile</Link> : null}
              {(item.type === "friend_request_received" || item.type === "friend_request_accepted") ? (
                <Link href="/friends">Open friends</Link>
              ) : null}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
