"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "@/components/layout/auth-provider";
import { signInWithEmail } from "@/lib/services/auth-service";
import { emailSchema, passwordSchema } from "@/lib/utils/validation";

const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (user) {
      const nextPath = searchParams.get("next") || "/feed";
      router.replace(nextPath);
    }
  }, [router, searchParams, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const parsed = signInSchema.parse({ email, password });
      await signInWithEmail(parsed.email, parsed.password);
      const nextPath = searchParams.get("next") || "/feed";
      router.replace(nextPath);
    } catch (caught) {
      if (caught instanceof z.ZodError) {
        setError(caught.issues[0]?.message ?? "Please check your input and try again.");
      } else if (caught instanceof Error) {
        setError(caught.message);
      } else {
        setError("Unable to sign in right now.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-postcard border border-stamp-muted bg-white p-6 shadow-postcard">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-stamp-ink/75">Welcome back. Let&apos;s stamp something.</p>

      <form className="space-y-3" onSubmit={handleSubmit}>
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

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {notice ? <p className="text-sm text-stamp-accent">{notice}</p> : null}

        <button
          className="rounded border border-stamp-muted px-4 py-2 hover:bg-stamp-muted disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-stamp-ink/70">
        New here? <Link href="/sign-up">Create account</Link>
      </p>
    </section>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stamp-ink/70">Loading sign-in…</p>}>
      <SignInContent />
    </Suspense>
  );
}
