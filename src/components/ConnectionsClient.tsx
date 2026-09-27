"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Info, Search, Users } from "lucide-react";
import { Avatar, EmptyState, Input, Tag, cx } from "@/components/ui";
import type { AllConnectionRow, SpaceSummaryView } from "@/lib/types";

export default function ConnectionsClient({
  people,
  spaces,
}: {
  people: AllConnectionRow[];
  spaces: SpaceSummaryView[];
}) {
  const [query, setQuery] = useState("");
  const [spaceFilter, setSpaceFilter] = useState<string | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (spaceFilter !== "all" && p.space.id !== spaceFilter) return false;
      if (!q) return true;
      return `${p.name} ${p.relationshipToMe ?? ""} ${p.tags.join(" ")}`.toLowerCase().includes(q);
    });
  }, [people, query, spaceFilter]);

  return (
    <div className="min-h-dvh cm-aurora">
      <div className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-8">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">All Connections</h1>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
            <Info className="size-3.5" />
            Read-only view across every space. People with the same name stay separate — nothing is merged.
          </p>
        </header>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search everyone…"
              className="pl-9"
              aria-label="Search all connections"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 cm-scroll">
            <FilterChip active={spaceFilter === "all"} onClick={() => setSpaceFilter("all")}>
              All spaces
            </FilterChip>
            {spaces.map((s) => (
              <FilterChip key={s.id} active={spaceFilter === s.id} onClick={() => setSpaceFilter(s.id)}>
                {s.icon} {s.name}
              </FilterChip>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title={people.length === 0 ? "No people yet" : "No matches"}
            body={
              people.length === 0
                ? "Add people inside a space and they will appear here, grouped by the space they belong to."
                : "Try a different name, tag or relationship."
            }
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/spaces/${p.space.id}`}
                className="flex items-center gap-3 rounded-2xl p-3 transition hover:border-primary/50 cm-card"
              >
                <Avatar name={p.name} src={p.avatarUrl} size={44} ring={p.space.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-[11px] text-muted">
                    {p.relationshipToMe ?? "No relationship label"} · {p.connectionCount} connections
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                      style={{ backgroundColor: `${p.space.color}22`, color: "#E2E8F0", border: `1px solid ${p.space.color}55` }}
                    >
                      {p.space.icon} {p.space.name}
                    </span>
                    {p.tags.slice(0, 2).map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition",
        active ? "border-primary/60 bg-primary/15 text-ink" : "border-line/70 text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
