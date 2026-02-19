"use client";

import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/layout/auth-provider";
import { db } from "@/lib/firebase/client";
import { DEFAULT_THEME, resolveTheme } from "@/lib/utils/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    const body = document.body;

    if (!user) {
      body.dataset.theme = DEFAULT_THEME;
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const rawTheme = (snapshot.data()?.backgroundUrl as string | undefined) ?? DEFAULT_THEME;
      body.dataset.theme = resolveTheme(rawTheme);
    });

    return () => unsubscribe();
  }, [user]);

  return <>{children}</>;
}
