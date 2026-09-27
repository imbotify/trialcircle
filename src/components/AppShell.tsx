"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Layers, LogOut, Search, Settings, Users } from "lucide-react";
import { Avatar, cx } from "@/components/ui";
import type { AccountView, SpaceSummaryView } from "@/lib/types";

const NAV = [
  { href: "/spaces", label: "My Spaces", icon: Layers },
  { href: "/search", label: "Search", icon: Search },
  { href: "/connections", label: "All Connections", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({
  user,
  spaces,
  children,
}: {
  user: AccountView;
  spaces: SpaceSummaryView[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh bg-bg">
      {/* Desktop / tablet sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line/60 bg-surface/50 px-3 py-4 lg:flex">
        <Link href="/spaces" className="mb-6 flex items-center gap-2.5 px-2">
          <span className="relative flex size-8 items-center justify-center" aria-hidden>
            <span className="absolute left-0 top-0 size-5 rounded-full bg-primary/80" />
            <span className="absolute bottom-0 right-0 size-4 rounded-full bg-highlight/80" />
            <span className="absolute bottom-0.5 left-1 size-3.5 rounded-full bg-accent/80" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">CircleMap</span>
        </Link>

        <nav className="space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                isActive(href)
                  ? "bg-primary/15 text-ink shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]"
                  : "text-muted hover:bg-elevated/50 hover:text-ink",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 px-3 text-[11px] font-medium uppercase tracking-widest text-muted/60">Spaces</div>
        <div className="mt-2 flex-1 space-y-0.5 overflow-y-auto cm-scroll">
          {spaces.length === 0 && <p className="px-3 text-xs text-muted/70">No spaces yet.</p>}
          {spaces.map((space) => (
            <Link
              key={space.id}
              href={`/spaces/${space.id}`}
              className={cx(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                pathname === `/spaces/${space.id}`
                  ? "bg-elevated/70 text-ink"
                  : "text-muted hover:bg-elevated/40 hover:text-ink",
              )}
            >
              <span
                className="flex size-7 items-center justify-center rounded-lg text-[13px]"
                style={{ backgroundColor: `${space.color}22`, border: `1px solid ${space.color}55` }}
              >
                {space.icon}
              </span>
              <span className="truncate">{space.name}</span>
            </Link>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-line/60 bg-elevated/40 p-2.5">
          <Avatar name={user.displayName} src={user.avatarUrl} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-ink">{user.displayName}</p>
            <p className="truncate text-[11px] text-muted">{user.email}</p>
          </div>
          <button
            onClick={signOut}
            disabled={signingOut}
            aria-label="Sign out"
            title="Sign out"
            className="rounded-lg p-1.5 text-muted transition hover:bg-danger/15 hover:text-danger"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">{children}</div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line/60 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cx(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] transition",
              isActive(href) ? "text-primary" : "text-muted",
            )}
          >
            <Icon className="size-5" />
            {label.replace("All ", "").replace("My ", "")}
          </Link>
        ))}
      </nav>
    </div>
  );
}
