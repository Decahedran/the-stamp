"use client";

import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/layout/auth-provider";
import { db } from "@/lib/firebase/client";
import { DEFAULT_THEME, getDarkerHexColor, getThemeBackgroundColor, resolveTheme } from "@/lib/utils/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    const body = document.body;

    if (!user) {
      body.dataset.theme = DEFAULT_THEME;
      const defaultBackground = getThemeBackgroundColor(DEFAULT_THEME);
      body.style.setProperty("--theme-bg", defaultBackground);
      body.style.setProperty("--theme-fg", getDarkerHexColor(defaultBackground, 0.55));
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const rawTheme = (snapshot.data()?.backgroundUrl as string | undefined) ?? DEFAULT_THEME;
      const resolvedTheme = resolveTheme(rawTheme);
      body.dataset.theme = resolvedTheme;

      const backgroundColor = getThemeBackgroundColor(resolvedTheme);
      body.style.setProperty("--theme-bg", backgroundColor);
      body.style.setProperty("--theme-fg", getDarkerHexColor(backgroundColor, 0.55));
    });

    return () => unsubscribe();
  }, [user]);

  return <>{children}</>;
}
