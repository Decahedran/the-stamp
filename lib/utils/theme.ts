export const DEFAULT_THEME = "theme:linen";

export const THEMES = [
  { key: "theme:linen", label: "Linen (default)" },
  { key: "theme:rose", label: "Rose" },
  { key: "theme:sea", label: "Sea" },
  { key: "theme:forest", label: "Forest" },
  { key: "theme:midnight", label: "Midnight" },
  { key: "theme:neon-dusk", label: "Neon Dusk" },
  { key: "theme:plum-noir", label: "Plum Noir" },
  { key: "theme:ember", label: "Ember" },
  { key: "theme:velvet-ocean", label: "Velvet Ocean" },
  { key: "theme:obsidian-rose", label: "Obsidian Rose" },
  { key: "theme:storm", label: "Storm" },
  { key: "theme:toxic-lime", label: "Toxic Lime" }
] as const;

export const CUSTOM_THEME_KEY = "theme:custom";

export const THEME_BACKGROUND_COLORS: Record<string, string> = {
  "theme:linen": "#f4f1ea",
  "theme:rose": "#fff1f5",
  "theme:sea": "#eff6ff",
  "theme:forest": "#ecfdf5",
  "theme:midnight": "#0f172a",
  "theme:neon-dusk": "#2e1065",
  "theme:plum-noir": "#3b0764",
  "theme:ember": "#7f1d1d",
  "theme:velvet-ocean": "#164e63",
  "theme:obsidian-rose": "#4a044e",
  "theme:storm": "#1f2937",
  "theme:toxic-lime": "#365314"
};

const THEME_KEY_SET = new Set(THEMES.map((item) => item.key));

function normalizeHexColor(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("#") ? normalized.slice(1) : normalized;
}

export function createCustomThemeKey(hexColor: string): string {
  const normalized = normalizeHexColor(hexColor);
  if (!/^[0-9a-f]{6}$/.test(normalized)) {
    return `${CUSTOM_THEME_KEY}-334155`;
  }

  return `${CUSTOM_THEME_KEY}-${normalized}`;
}

export function parseCustomThemeColor(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const match = /^theme:custom-([0-9a-f]{6})$/.exec(value.toLowerCase());
  return match ? `#${match[1]}` : null;
}

export function resolveTheme(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_THEME;
  }

  if (parseCustomThemeColor(value)) {
    return value.toLowerCase();
  }

  return THEME_KEY_SET.has(value as (typeof THEMES)[number]["key"]) ? value : DEFAULT_THEME;
}

export function getThemeBackgroundColor(themeKey: string): string {
  const customColor = parseCustomThemeColor(themeKey);
  if (customColor) {
    return customColor;
  }

  return THEME_BACKGROUND_COLORS[themeKey] ?? THEME_BACKGROUND_COLORS[DEFAULT_THEME];
}

export function getDarkerHexColor(hexColor: string, amount = 0.35): string {
  const normalized = normalizeHexColor(hexColor);
  if (!/^[0-9a-f]{6}$/.test(normalized)) {
    return "#0f172a";
  }

  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  const nextRed = clamp(red * (1 - amount));
  const nextGreen = clamp(green * (1 - amount));
  const nextBlue = clamp(blue * (1 - amount));

  return `#${nextRed.toString(16).padStart(2, "0")}${nextGreen.toString(16).padStart(2, "0")}${nextBlue
    .toString(16)
    .padStart(2, "0")}`;
}
