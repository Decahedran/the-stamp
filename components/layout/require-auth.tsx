"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/layout/auth-provider";

type RequireAuthProps = {
  children: React.ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      const next = encodeURIComponent(pathname || "/feed");
      router.replace(`/sign-in?next=${next}`);
    }
  }, [loading, pathname, router, user]);

  if (loading || !user) {
    return <p className="text-sm text-stamp-ink/70">Checking your envelope seal...</p>;
  }

  return <>{children}</>;
}
