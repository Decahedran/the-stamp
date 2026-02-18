"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import { subscribeToUnreadNotificationCount } from "@/lib/services/notification-service";

export function UnreadNotificationBadge() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    return subscribeToUnreadNotificationCount(user.uid, (nextCount) => {
      setCount(nextCount);
    });
  }, [user]);

  if (count <= 0) {
    return null;
  }

  return (
    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-stamp-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
