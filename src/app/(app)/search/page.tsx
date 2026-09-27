"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { Avatar, EmptyState, Input, Skeleton, Tag } from "@/components/ui";
import type { AllConnectionRow } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AllConnectionRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/connections?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { people?: AllConnectionRow[] };
        setResults(data.people ?? []);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="min-h-dvh cm-aurora">
      <div className="mx-auto w-full max-w-3xl px-5 py-7 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Search</h1>
        <p className="mt-1.5 text-sm text-muted">Find anyone by name, relationship, tag or space.</p>

        <div className="relative mt-5">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try “cousin”, “work”, “Priya”…"
            className="h-12 pl-10"
            aria-label="Search people"
          />
        </div>

        <div className="mt-5 space-y-2">
          {loading && (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          )}

          {!loading && results === null && (
            <EmptyState
              icon={<Sparkles className="size-6" />}
              title="Start typing"
              body="Search runs across every space you own. Results never include anyone else's data."
            />
          )}

          {!loading && results?.length === 0 && (
            <EmptyState icon={<SearchIcon className="size-6" />} title="No matches" body="Try another name, tag or relationship label." />
          )}

          {!loading &&
            results?.map((p) => (
              <Link
                key={p.id}
                href={`/spaces/${p.space.id}`}
                className="flex items-center gap-3 rounded-2xl p-3 transition hover:border-primary/50 cm-card"
              >
                <Avatar name={p.name} src={p.avatarUrl} size={42} ring={p.space.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-[11px] text-muted">{p.relationshipToMe ?? "No relationship label"}</p>
                </div>
                <div className="hidden shrink-0 gap-1.5 sm:flex">
                  {p.tags.slice(0, 2).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
                  style={{ backgroundColor: `${p.space.color}22`, border: `1px solid ${p.space.color}55` }}
                >
                  {p.space.icon} {p.space.name}
                </span>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
