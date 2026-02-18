import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <header className="rounded-postcard border border-stamp-muted bg-white p-6 shadow-postcard">
        <h1 className="text-3xl font-bold">The Stamp 💌</h1>
        <p className="mt-2 text-sm text-stamp-ink/80">
          A tiny postcard-style social space for you and your friends.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link className="rounded-postcard border border-stamp-muted bg-white p-4" href="/sign-in">
          Sign in
        </Link>
        <Link className="rounded-postcard border border-stamp-muted bg-white p-4" href="/sign-up">
          Create account
        </Link>
      </section>
    </div>
  );
}
