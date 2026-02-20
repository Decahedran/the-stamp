"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/layout/auth-provider";
import {
  getNextAddressChangeDate,
  getUserProfile,
  updateAddress,
  updateProfileFields
} from "@/lib/services/profile-service";
import type { UserProfile } from "@/lib/types/db";
import {
  CUSTOM_THEME_KEY,
  DEFAULT_THEME,
  THEMES,
  createCustomThemeKey,
  parseCustomThemeColor,
  resolveTheme
} from "@/lib/utils/theme";
import { addressSchema, bioSchema, displayNameSchema } from "@/lib/utils/validation";
import { z } from "zod";

const profileSchema = z.object({
  displayName: displayNameSchema,
  bio: bioSchema
});

const addressOnlySchema = z.object({
  address: addressSchema
});

export function ProfileSettingsForm() {
  const { user } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [customThemeColor, setCustomThemeColor] = useState("#334155");
  const [newAddress, setNewAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const nextAddressChangeDate = useMemo(
    () => getNextAddressChangeDate(profile?.addressLastChangedAt ?? null),
    [profile?.addressLastChangedAt]
  );

  async function loadProfile() {
    if (!user) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getUserProfile(user.uid);
      if (!data) {
        throw new Error("Could not load profile settings.");
      }

      setProfile(data);
      setDisplayName(data.displayName);
      setBio(data.bio);
      const resolvedTheme = resolveTheme(data.backgroundUrl);
      const savedCustomColor = parseCustomThemeColor(resolvedTheme);

      setTheme(savedCustomColor ? CUSTOM_THEME_KEY : resolvedTheme);
      setCustomThemeColor(savedCustomColor ?? "#334155");
      setNewAddress(data.address);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load profile settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  if (!user) {
    return null;
  }

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const currentUser = user;
    if (!currentUser) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const parsed = profileSchema.parse({ displayName, bio });
      const resolvedSelection =
        theme === CUSTOM_THEME_KEY ? createCustomThemeKey(customThemeColor) : resolveTheme(theme);

      await updateProfileFields(currentUser.uid, {
        displayName: parsed.displayName,
        bio: parsed.bio,
        photoUrl: resolvedSelection,
        backgroundUrl: resolvedSelection
      });

      setNotice("Profile updated.");
      await loadProfile();
    } catch (caught) {
      if (caught instanceof z.ZodError) {
        setError(caught.issues[0]?.message ?? "Could not update profile.");
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Could not update profile.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddressSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const currentUser = user;
    if (!currentUser) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const parsed = addressOnlySchema.parse({ address: newAddress.trim().toLowerCase().replace(/^@+/, "") });
      await updateAddress(currentUser.uid, parsed.address);
      setNotice("@ddress updated.");
      await loadProfile();
    } catch (caught) {
      if (caught instanceof z.ZodError) {
        setError(caught.issues[0]?.message ?? "Could not update @ddress.");
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Could not update @ddress.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <header className="rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard">
        <h1 className="text-2xl font-semibold">Profile Settings</h1>
        {profile ? (
          <p className="text-sm text-stamp-ink/75">
            Current profile: <Link href={`/profile/${profile.address}`}>@{profile.address}</Link>
          </p>
        ) : null}
      </header>

      {loading ? <p className="text-sm text-stamp-ink/70">Loading settings…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-stamp-accent">{notice}</p> : null}

      <form className="space-y-3 rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard" onSubmit={handleProfileSave}>
        <h2 className="text-lg font-semibold">Display profile</h2>

        <label className="block text-sm">
          Display name
          <input
            className="mt-1 w-full rounded border border-stamp-muted px-3 py-2"
            onChange={(event) => setDisplayName(event.target.value)}
            value={displayName}
          />
        </label>

        <label className="block text-sm">
          Bio
          <textarea
            className="mt-1 h-20 w-full rounded border border-stamp-muted px-3 py-2"
            maxLength={160}
            onChange={(event) => setBio(event.target.value)}
            value={bio}
          />
        </label>

        <label className="block text-sm">
          Theme
          <select
            className="mt-1 w-full rounded border border-stamp-muted px-3 py-2"
            onChange={(event) => setTheme(event.target.value)}
            value={theme}
          >
            {THEMES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
            <option value={CUSTOM_THEME_KEY}>Custom</option>
          </select>
        </label>

        {theme === CUSTOM_THEME_KEY ? (
          <label className="block text-sm">
            Custom color
            <div className="mt-1 flex items-center gap-3">
              <input
                aria-label="Custom theme color"
                className="h-10 w-14 cursor-pointer rounded border border-stamp-muted bg-transparent p-1"
                onChange={(event) => setCustomThemeColor(event.target.value)}
                type="color"
                value={customThemeColor}
              />
              <code className="rounded bg-stamp-muted px-2 py-1 text-xs">{customThemeColor.toUpperCase()}</code>
            </div>
          </label>
        ) : null}

        <button
          className="rounded border border-stamp-muted px-3 py-2 text-sm hover:bg-stamp-muted disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          Save profile
        </button>
      </form>

      <form className="space-y-3 rounded-postcard border border-stamp-muted bg-white p-4 shadow-postcard" onSubmit={handleAddressSave}>
        <h2 className="text-lg font-semibold">@ddress</h2>

        <label className="block text-sm">
          New @ddress
          <input
            className="mt-1 w-full rounded border border-stamp-muted px-3 py-2"
            onChange={(event) => setNewAddress(event.target.value)}
            value={newAddress}
          />
        </label>

        <p className="text-xs text-stamp-ink/70">
          You can change your @ddress once every 7 days.
          {nextAddressChangeDate ? ` Next allowed: ${nextAddressChangeDate.toLocaleString()}` : ""}
        </p>

        <button
          className="rounded border border-stamp-muted px-3 py-2 text-sm hover:bg-stamp-muted disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          Update @ddress
        </button>
      </form>
    </section>
  );
}
