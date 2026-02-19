"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { UnreadNotificationBadge } from "@/components/notifications/unread-badge";
import { signOutCurrentUser } from "@/lib/services/auth-service";

export function TopNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isAuthRoute = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  if (isAuthRoute) {
    return null;
  }

  return (
    <header className="mb-6 flex items-center justify-between rounded-postcard border border-stamp-muted bg-white px-4 py-3 shadow-postcard">
      <Link className="font-semibold" href={user ? "/feed" : "/"}>
        The Stamp 💌
      </Link>

      <nav className="flex items-center gap-3 text-sm">
        {!loading && user ? (
          <>
            <Link href="/feed">Feed</Link>
            <Link href="/friends">Friends</Link>
            <Link className="inline-flex items-center" href="/notifications">
              Notifications
              <UnreadNotificationBadge />
            </Link>
            <Link href="/settings/profile">Settings</Link>
            <button
              className="rounded border border-stamp-muted px-3 py-1 hover:bg-stamp-muted"
              onClick={() => {
                void signOutCurrentUser();
              }}
              type="button"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/sign-in">Sign in</Link>
            <Link href="/sign-up">Create account</Link>
          </>
        )}
      </nav>
    </header>
  );
}
