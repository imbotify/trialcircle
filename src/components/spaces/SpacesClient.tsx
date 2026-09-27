"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, MoreVertical, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  FieldError,
  Input,
  Label,
  Overlay,
  Textarea,
  cx,
  useToast,
} from "@/components/ui";
import type { SpaceSummaryView } from "@/lib/types";

const ICONS = ["🏠", "💼", "🎓", "🌿", "❤️", "🎯", "🎨", "🏋️", "✈️", "🍜"];
const COLORS = ["#6366F1", "#8B5CF6", "#06B6D4", "#EC4899", "#10B981", "#F59E0B"];

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

type Draft = { id?: string; name: string; description: string; icon: string; color: string };

const EMPTY_DRAFT: Draft = { name: "", description: "", icon: "🏠", color: "#6366F1" };

export default function SpacesClient({
  initialSpaces,
  displayName,
}: {
  initialSpaces: SpaceSummaryView[];
  displayName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [spaces, setSpaces] = useState(initialSpaces);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpaceSummaryView | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  async function saveSpace() {
    if (!draft) return;
    setError(null);
    if (draft.name.trim().length < 2) {
      setError("Give your space a name (2+ characters).");
      return;
    }
    setSaving(true);
    const isEdit = Boolean(draft.id);
    const optimisticId = draft.id ?? `tmp-${Date.now()}`;

    // Optimistic write
    setSpaces((prev) =>
      isEdit
        ? prev.map((s) => (s.id === draft.id ? { ...s, ...draft, description: draft.description || null } : s))
        : [
            {
              id: optimisticId,
              name: draft.name,
              description: draft.description || null,
              icon: draft.icon,
              color: draft.color,
              peopleCount: 0,
              connectionCount: 0,
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ],
    );

    try {
      const res = await fetch(isEdit ? `/api/spaces/${draft.id}` : "/api/spaces", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json()) as { error?: string; space?: { id: string } };
      if (!res.ok) throw new Error(data.error ?? "Could not save the space.");
      toast(isEdit ? "Space updated" : "Space created");
      setDraft(null);
      if (!isEdit && data.space?.id) {
        router.push(`/spaces/${data.space.id}`);
      }
      startTransition(() => router.refresh());
    } catch (e) {
      setSpaces(initialSpaces);
      setError(e instanceof Error ? e.message : "Could not save the space.");
      toast("Could not save the space", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const snapshot = spaces;
    setSpaces((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    try {
      const res = await fetch(`/api/spaces/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete the space.");
      toast("Space deleted");
      setDeleteTarget(null);
      startTransition(() => router.refresh());
    } catch {
      setSpaces(snapshot);
      toast("Could not delete the space", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="relative min-h-dvh cm-aurora" onClick={() => setMenuFor(null)}>
      <div className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-8">
        <header className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted/70">Hey {displayName.split(" ")[0]}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">My Spaces</h1>
            <p className="mt-1.5 text-sm text-muted">Each space is a private context — its people never mix.</p>
          </div>
          <Button icon={<Plus className="size-4" />} onClick={() => setDraft(EMPTY_DRAFT)} className="shrink-0">
            <span className="hidden sm:inline">New Space</span>
          </Button>
        </header>

        {spaces.length === 0 ? (
          <EmptyState
            icon={<Layers className="size-6" />}
            title="No spaces yet"
            body="Spaces keep your family, work and friend circles separate. Create your first one to start mapping."
            action={
              <Button icon={<Plus className="size-4" />} onClick={() => setDraft(EMPTY_DRAFT)}>
                Create a space
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {spaces.map((space) => (
              <div key={space.id} className="group relative rounded-2xl p-4 transition hover:border-primary/50 cm-card">
                <Link href={`/spaces/${space.id}`} className="flex items-start gap-3.5">
                  <span
                    className="flex size-12 shrink-0 items-center justify-center rounded-2xl text-xl"
                    style={{ backgroundColor: `${space.color}22`, border: `1px solid ${space.color}66` }}
                  >
                    {space.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-semibold text-ink">{space.name}</h2>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">
                      {space.description || "No description"}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-[11px] text-muted/80">
                      <Users className="size-3.5" />
                      {space.peopleCount} {space.peopleCount === 1 ? "person" : "people"}
                      <span className="text-muted/40">•</span>
                      {space.connectionCount} connections
                      <span className="text-muted/40">•</span>
                      {relativeTime(space.updatedAt)}
                    </p>
                  </div>
                </Link>

                <div className="absolute right-2 top-2">
                  <button
                    aria-label={`Manage ${space.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor === space.id ? null : space.id);
                    }}
                    className="rounded-lg p-1.5 text-muted opacity-60 transition hover:bg-elevated hover:text-ink group-hover:opacity-100"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                  {menuFor === space.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-line/70 bg-surface shadow-xl"
                    >
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-muted transition hover:bg-elevated hover:text-ink"
                        onClick={() => {
                          setDraft({
                            id: space.id,
                            name: space.name,
                            description: space.description ?? "",
                            icon: space.icon,
                            color: space.color,
                          });
                          setMenuFor(null);
                        }}
                      >
                        <Pencil className="size-3.5" /> Edit space
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-danger transition hover:bg-danger/10"
                        onClick={() => {
                          setDeleteTarget(space);
                          setMenuFor(null);
                        }}
                      >
                        <Trash2 className="size-3.5" /> Delete space
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Overlay open={Boolean(draft)} onClose={() => setDraft(null)} title={draft?.id ? "Edit space" : "Create a new Space"}>
        {draft && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="space-name">Space name</Label>
              <Input
                id="space-name"
                autoFocus
                value={draft.name}
                placeholder="My Family"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="space-desc">Description (optional)</Label>
              <Textarea
                id="space-desc"
                rows={2}
                value={draft.description}
                placeholder="People who are part of my family"
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon })}
                    aria-pressed={draft.icon === icon}
                    className={cx(
                      "flex size-10 items-center justify-center rounded-xl border text-lg transition",
                      draft.icon === icon ? "border-primary bg-primary/15" : "border-line/70 bg-surface/60 hover:border-line",
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Colour ${color}`}
                    aria-pressed={draft.color === color}
                    onClick={() => setDraft({ ...draft, color })}
                    className={cx(
                      "size-9 rounded-full border-2 transition",
                      draft.color === color ? "border-ink scale-110" : "border-transparent",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <FieldError>{error}</FieldError>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button loading={saving} onClick={saveSpace}>
                {draft.id ? "Save changes" : "Create Space"}
              </Button>
            </div>
          </div>
        )}
      </Overlay>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete "${deleteTarget?.name ?? ""}"?`}
        body="This permanently removes the space with all of its people, relationships, custom fields, media and memories. This cannot be undone."
        confirmLabel="Delete space"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
