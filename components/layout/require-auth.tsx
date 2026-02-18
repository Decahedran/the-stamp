"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";
import { resendVerificationEmail, signOutCurrentUser } from "@/lib/services/auth-service";

type RequireAuthProps = {
  children: React.ReactNode;
  requireVerified?: boolean;
};

export function RequireAuth({ children, requireVerified = true }: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, refreshUser } = useAuth();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(pathname || "/feed");
      router.replace(`/sign-in?next=${next}`);
    }
  }, [loading, pathname, router, user]);

  const needsVerification = useMemo(
    () => Boolean(user && requireVerified && !user.emailVerified),
    [requireVerified, user]
  );

  if (loading || !user) {
    return <p className="text-sm text-stamp-ink/70">Checking your envelope seal...</p>;
  }

  if (needsVerification) {
    return (
      <section className="space-y-4 rounded-postcard border border-stamp-muted bg-white p-6 shadow-postcard">
        <h1 className="text-2xl font-semibold">Verify your email first</h1>
        <p className="text-sm text-stamp-ink/80">
          We sent a verification link to <strong>{user.email}</strong>. Click it, then tap refresh below.
        </p>
        {notice ? <p className="text-sm text-stamp-accent">{notice}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded border border-stamp-muted px-3 py-2 hover:bg-stamp-muted"
            onClick={() => {
              void (async () => {
                await refreshUser();
                setNotice("Account refreshed. If still unverified, check your inbox/spam.");
              })();
            }}
            type="button"
          >
            I verified, refresh status
          </button>
          <button
            className="rounded border border-stamp-muted px-3 py-2 hover:bg-stamp-muted"
            onClick={() => {
              void (async () => {
                await resendVerificationEmail();
                setNotice("Verification email re-sent.");
              })();
            }}
            type="button"
          >
            Re-send verification
          </button>
          <button
            className="rounded border border-stamp-muted px-3 py-2 hover:bg-stamp-muted"
            onClick={() => {
              void signOutCurrentUser();
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
