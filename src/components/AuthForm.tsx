"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Sparkles } from "lucide-react";
import { Button, FieldError, Input, Label } from "@/components/ui";

type Mode = "login" | "signup";

export default function AuthForm({
  initialMode,
  autoDemo,
  demo,
}: {
  initialMode: Mode;
  autoDemo?: boolean;
  demo: { email: string; password: string };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"form" | "demo" | null>(null);
  const started = useRef(false);

  async function post(url: string, body?: Record<string, unknown>) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
    return data;
  }

  async function enterDemo() {
    setError(null);
    setLoading("demo");
    try {
      await post("/api/auth/demo");
      router.replace("/spaces");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the demo.");
      setLoading(null);
    }
  }

  useEffect(() => {
    if (autoDemo && !started.current) {
      started.current = true;
      void enterDemo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDemo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("form");
    try {
      if (mode === "signup") {
        await post("/api/auth/signup", { email, password, displayName });
      } else {
        await post("/api/auth/login", { email, password });
      }
      router.replace("/spaces");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(null);
    }
  }

  return (
    <div className="relative z-10 w-full max-w-md rounded-3xl border border-line/70 p-7 cm-glass cm-fade-up">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center">
          <span className="relative flex size-11 items-center justify-center" aria-hidden>
            <span className="absolute left-0 top-0 size-7 rounded-full bg-primary/80" />
            <span className="absolute bottom-0 right-0 size-6 rounded-full bg-highlight/80" />
            <span className="absolute bottom-1 left-1 size-5 rounded-full bg-accent/80" />
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1.5 text-sm text-muted">Your private relationship map</p>
      </div>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {mode === "signup" && (
          <div>
            <Label htmlFor="displayName">Your name</Label>
            <Input
              id="displayName"
              value={displayName}
              autoComplete="name"
              placeholder="Krpto"
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            autoComplete="email"
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="At least 8 characters"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" size="lg" className="w-full" loading={loading === "form"} icon={<Mail className="size-4" />}>
          {mode === "login" ? "Continue with Email" : "Create account"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted/70">
        <span className="h-px flex-1 bg-line/70" /> or <span className="h-px flex-1 bg-line/70" />
      </div>

      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        loading={loading === "demo"}
        onClick={enterDemo}
        icon={<Sparkles className="size-4 text-primary" />}
      >
        Explore the demo map
      </Button>
      <p className="mt-3 text-center text-[11px] text-muted/80">
        Demo account: {demo.email} · {demo.password}
      </p>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? "New to CircleMap?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
          }}
          className="font-medium text-primary hover:underline"
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </p>
      <p className="mt-4 text-center text-[11px] leading-relaxed text-muted/70">
        Everything you add stays private to your account.{" "}
        <Link href="/" className="underline hover:text-muted">
          Back to home
        </Link>
      </p>
    </div>
  );
}
