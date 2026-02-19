export const DEFAULT_THEME = "theme:linen";

export const THEMES = [
  { key: "theme:linen", label: "Linen (default)" },
  { key: "theme:rose", label: "Rose" },
  { key: "theme:sea", label: "Sea" },
  { key: "theme:forest", label: "Forest" }
] as const;

const THEME_KEY_SET = new Set(THEMES.map((item) => item.key));

export function resolveTheme(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_THEME;
  }

  return THEME_KEY_SET.has(value as (typeof THEMES)[number]["key"]) ? value : DEFAULT_THEME;
}
