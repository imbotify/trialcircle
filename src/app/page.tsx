import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Lock, Network, Sparkles, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PILLARS = [
  { icon: Lock, title: "Private", body: "Only you can see your data. Every read is ownership-checked." },
  { icon: Users, title: "Personal", body: "Your people, your words, your relationship labels." },
  { icon: Network, title: "Visual", body: "A true graph — not a contact list pretending to be one." },
  { icon: Sparkles, title: "Organized", body: "Spaces, profiles, memories and media in context." },
];

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (user) redirect("/spaces");

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden cm-aurora">
      <div className="absolute inset-0 cm-grid opacity-60" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-lg font-semibold tracking-tight">CircleMap</span>
          </div>
          <Link
            href="/login"
            className="rounded-xl border border-line/70 px-4 py-2 text-sm text-muted transition hover:border-primary/60 hover:text-ink"
          >
            Sign in
          </Link>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-indigo-200">
            <Sparkles className="size-3.5" /> Your private relationship map
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Map the people
            <span className="bg-gradient-to-r from-primary via-secondary to-highlight bg-clip-text text-transparent">
              {" "}
              who matter.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            Create private spaces, add the people in your life, connect them to each other — not just to you — and keep
            the memories, details and documents that give each relationship context.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/login?mode=signup"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-secondary px-6 text-sm font-medium text-white shadow-[0_12px_40px_-12px_rgba(99,102,241,0.9)] transition hover:brightness-110"
            >
              Get started <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/login?demo=1"
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-line/70 px-6 text-sm text-muted transition hover:border-primary/60 hover:text-ink"
            >
              Explore the demo map
            </Link>
          </div>
        </section>

        <section className="grid gap-3 pb-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl p-4 cm-card">
              <Icon className="mb-3 size-5 text-primary" />
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}

function Logo() {
  return (
    <span className="relative flex size-9 items-center justify-center" aria-hidden>
      <span className="absolute left-0 top-0 size-6 rounded-full bg-primary/80 blur-[1px]" />
      <span className="absolute bottom-0 right-0 size-5 rounded-full bg-highlight/80 blur-[1px]" />
      <span className="absolute bottom-1 left-1 size-4 rounded-full bg-accent/80 blur-[1px]" />
    </span>
  );
}
