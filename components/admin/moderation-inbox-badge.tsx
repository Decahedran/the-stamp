"use client";

import { useEffect, useState } from "react";
import { subscribeToModerationInboxCount } from "@/lib/services/safety-service";

type ModerationInboxBadgeProps = {
  enabled: boolean;
};

export function ModerationInboxBadge({ enabled }: ModerationInboxBadgeProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    return subscribeToModerationInboxCount((nextCount) => {
      setCount(nextCount);
    });
  }, [enabled]);

  if (!enabled || count <= 0) {
    return null;
  }

  return (
    <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
