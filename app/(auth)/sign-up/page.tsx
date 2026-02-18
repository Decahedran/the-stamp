"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/components/layout/auth-provider";
import { deleteCurrentUserAccount, signOutCurrentUser, signUpWithEmail } from "@/lib/services/auth-service";
import { createInitialUserProfile, isAddressAvailable } from "@/lib/services/profile-service";
import { addressSchema, displayNameSchema, emailSchema, passwordSchema } from "@/lib/utils/validation";

const signUpSchema = z
  .object({
    displayName: displayNameSchema,
    address: addressSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string()
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export default function SignUpPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const normalizedAddress = useMemo(() => address.trim().toLowerCase().replace(/^@+/, ""), [address]);

  useEffect(() => {
    if (user?.emailVerified) {
      router.replace("/feed");
    }
  }, [router, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    let created = false;

    try {
      const parsed = signUpSchema.parse({
        displayName,
        address: normalizedAddress,
        email,
        password,
        confirmPassword
      });

      const available = await isAddressAvailable(parsed.address);
      if (!available) {
        throw new Error("That @ddress is already taken. Try another.");
      }

      const authUser = await signUpWithEmail(parsed.email, parsed.password, parsed.displayName);
      created = true;

      await createInitialUserProfile({
        uid: authUser.uid,
        email: parsed.email,
        displayName: parsed.displayName,
        address: parsed.address
      });

      await signOutCurrentUser();
      setSuccess(true);
    } catch (caught) {
      if (created) {
        try {
          await deleteCurrentUserAccount();
        } catch {
          // no-op cleanup best effort
        }
      }

      if (caught instanceof z.ZodError) {
        setError(caught.issues[0]?.message ?? "Please check your input and try again.");
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Unable to create your account right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <section className="space-y-4 rounded-postcard border border-stamp-muted bg-white p-6 shadow-postcard">
        <h1 className="text-2xl font-semibold">Check your mailbox 📬</h1>
        <p className="text-sm text-stamp-ink/80">
          Your account has been created. We sent a verification email to <strong>{email}</strong>.
        </p>
        <p className="text-sm text-stamp-ink/80">After verifying, sign in to enter The Stamp.</p>
        <Link className="inline-block rounded border border-stamp-muted px-3 py-2 hover:bg-stamp-muted" href="/sign-in">
          Go to sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-postcard border border-stamp-muted bg-white p-6 shadow-postcard">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <p className="text-sm text-stamp-ink/75">Pick your display name and unique @ddress.</p>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block text-sm">
          Display name
          <input
            className="mt-1 w-full rounded border border-stamp-muted px-3 py-2"
            onChange={(event) => setDisplayName(event.target.value)}
            required
            value={displayName}
          />
        </label>

        <label className="block text-sm">
          @ddress
          <input
            className="mt-1 w-full rounded border border-stamp-muted px-3 py-2"
            onChange={(event) => setAddress(event.target.value)}
            placeholder="your_address"
            required
            value={address}
          />
        </label>

        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded border border-stamp-muted px-3 py-2"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="block text-sm">
          Password
          <input
            className="mt-1 w-full rounded border border-stamp-muted px-3 py-2"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        <label className="block text-sm">
          Confirm password
          <input
            className="mt-1 w-full rounded border border-stamp-muted px-3 py-2"
            minLength={8}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          className="rounded border border-stamp-muted px-4 py-2 hover:bg-stamp-muted disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-stamp-ink/70">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </section>
  );
}
