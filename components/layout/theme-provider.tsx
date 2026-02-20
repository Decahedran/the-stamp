"use client";

import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/components/layout/auth-provider";
import { db } from "@/lib/firebase/client";
import { DEFAULT_THEME, parseCustomThemeColor, resolveTheme } from "@/lib/utils/theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    const body = document.body;

    if (!user) {
      body.dataset.theme = DEFAULT_THEME;
      body.style.removeProperty("--custom-theme-bg");
      body.style.removeProperty("--custom-theme-fg");
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const rawTheme = (snapshot.data()?.backgroundUrl as string | undefined) ?? DEFAULT_THEME;
      const resolvedTheme = resolveTheme(rawTheme);
      body.dataset.theme = resolvedTheme;

      const customColor = parseCustomThemeColor(resolvedTheme);
      if (customColor) {
        body.style.setProperty("--custom-theme-bg", customColor);

        const red = Number.parseInt(customColor.slice(1, 3), 16);
        const green = Number.parseInt(customColor.slice(3, 5), 16);
        const blue = Number.parseInt(customColor.slice(5, 7), 16);
        const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
        body.style.setProperty("--custom-theme-fg", luminance > 0.6 ? "#0f172a" : "#f8fafc");
      } else {
        body.style.removeProperty("--custom-theme-bg");
        body.style.removeProperty("--custom-theme-fg");
      }
    });

    return () => unsubscribe();
  }, [user]);

  return <>{children}</>;
}
