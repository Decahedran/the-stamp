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
