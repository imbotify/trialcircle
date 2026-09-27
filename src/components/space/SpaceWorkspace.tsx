"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Circle as CircleIcon,
  GitBranch,
  Link2,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import GraphCanvas from "@/components/graph/GraphCanvas";
import type { Point } from "@/components/graph/layout";
import { findPath } from "@/components/graph/layout";
import PersonPanel from "@/components/space/PersonPanel";
import {
  Button,
  ConfirmDialog,
  FieldError,
  Input,
  Label,
  Overlay,
  Segmented,
  Tag,
  cx,
  useToast,
} from "@/components/ui";
import type { EdgeView, SpaceGraphView, ViewMode } from "@/lib/types";

const RELATIONSHIP_SUGGESTIONS = [
  "Mother",
  "Father",
  "Brother",
  "Sister",
  "Cousin",
  "Best Friend",
  "Childhood Friend",
  "Colleague",
  "Manager",
  "Mentor",
  "Neighbour",
  "Gym Partner",
];

type Positions = Record<ViewMode, Record<string, Point>>;

function positionsFrom(graph: SpaceGraphView): Positions {
  const out: Positions = { circle: {}, tree: {} };
  for (const l of graph.layouts) out[l.viewMode][l.personId] = { x: l.x, y: l.y };
  return out;
}

export default function SpaceWorkspace({ initialGraph }: { initialGraph: SpaceGraphView }) {
  const router = useRouter();
  const toast = useToast();
  const [graph, setGraph] = useState(initialGraph);
  const [positions, setPositions] = useState<Positions>(() => positionsFrom(initialGraph));
  const [viewMode, setViewMode] = useState<ViewMode>("circle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [pathIds, setPathIds] = useState<string[] | null>(null);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [editEdge, setEditEdge] = useState<EdgeView | null>(null);
  const [deleteEdge, setDeleteEdge] = useState<EdgeView | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = useRef<Record<string, Point>>({});
  const timer = useRef<number | null>(null);

  const me = useMemo(() => graph.people.find((p) => p.isMe) ?? null, [graph.people]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/spaces/${graph.space.id}`);
    if (!res.ok) return;
    const data = (await res.json()) as SpaceGraphView;
    setGraph(data);
    setPositions((prev) => {
      const next = positionsFrom(data);
      return {
        circle: { ...next.circle, ...prev.circle },
        tree: { ...next.tree, ...prev.tree },
      };
    });
    router.refresh();
  }, [graph.space.id, router]);

  /** Layout writes are debounced so dragging never floods the network (spec §70). */
  const flushLayout = useCallback(async () => {
    const entries = Object.entries(pending.current);
    if (!entries.length) return;
    pending.current = {};
    try {
      await fetch(`/api/spaces/${graph.space.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viewMode,
          positions: entries.map(([personId, p]) => ({ personId, x: p.x, y: p.y })),
        }),
      });
    } catch {
      toast("Layout could not be saved — it will retry on your next move.", "error");
    }
  }, [graph.space.id, viewMode, toast]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const handleMove = useCallback(
    (id: string, x: number, y: number, committed: boolean) => {
      setPositions((prev) => ({ ...prev, [viewMode]: { ...prev[viewMode], [id]: { x, y } } }));
      if (!committed) return;
      pending.current[id] = { x, y };
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flushLayout(), 550);
    },
    [flushLayout, viewMode],
  );

  const dimmedIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const set = new Set<string>();
    for (const p of graph.people) {
      const haystack = `${p.name} ${p.relationshipToMe ?? ""} ${p.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(q)) set.add(p.id);
    }
    return set;
  }, [graph.people, query]);

  async function createPerson(input: { name: string; relationshipToMe: string; tags: string[] }) {
    const res = await fetch(`/api/spaces/${graph.space.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as SpaceGraphView & { error?: string; personId?: string };
    if (!res.ok) throw new Error(data.error ?? "Could not add this person.");
    setGraph(data);
    setPositions((prev) => {
      const next = positionsFrom(data);
      return { circle: { ...next.circle, ...prev.circle }, tree: { ...next.tree, ...prev.tree } };
    });
    if (data.personId) setSelectedId(data.personId);
    router.refresh();
    return data.personId;
  }

  async function createRelationship(fromPersonId: string, toPersonId: string, label: string, type: "mutual" | "directional") {
    const optimistic: EdgeView = {
      id: `tmp-${Date.now()}`,
      spaceId: graph.space.id,
      fromPersonId,
      toPersonId,
      label,
      type,
    };
    setGraph((g) => ({ ...g, relationships: [...g.relationships, optimistic] }));
    try {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromPersonId, toPersonId, label, type }),
      });
      const data = (await res.json()) as { error?: string; relationship?: EdgeView };
      if (!res.ok || !data.relationship) throw new Error(data.error ?? "Could not create the connection.");
      setGraph((g) => ({
        ...g,
        relationships: g.relationships.map((e) => (e.id === optimistic.id ? data.relationship! : e)),
      }));
      toast("Connection created");
      router.refresh();
    } catch (e) {
      setGraph((g) => ({ ...g, relationships: g.relationships.filter((r) => r.id !== optimistic.id) }));
      toast(e instanceof Error ? e.message : "Could not create the connection.", "error");
      throw e;
    }
  }

  async function removeRelationship(edge: EdgeView) {
    setBusy(true);
    const snapshot = graph.relationships;
    setGraph((g) => ({ ...g, relationships: g.relationships.filter((r) => r.id !== edge.id) }));
    try {
      const res = await fetch(`/api/items/relationship/${edge.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Connection removed");
      setDeleteEdge(null);
      router.refresh();
    } catch {
      setGraph((g) => ({ ...g, relationships: snapshot }));
      toast("Could not remove the connection", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdgeLabel(edge: EdgeView, label: string, type: "mutual" | "directional") {
    const snapshot = graph.relationships;
    setGraph((g) => ({
      ...g,
      relationships: g.relationships.map((r) => (r.id === edge.id ? { ...r, label, type } : r)),
    }));
    setEditEdge(null);
    try {
      const res = await fetch(`/api/items/relationship/${edge.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, type }),
      });
      if (!res.ok) throw new Error();
      toast("Relationship updated");
    } catch {
      setGraph((g) => ({ ...g, relationships: snapshot }));
      toast("Could not update the relationship", "error");
    }
  }

  async function removePerson(personId: string) {
    const snapshot = graph;
    setGraph((g) => ({
      ...g,
      people: g.people.filter((p) => p.id !== personId),
      relationships: g.relationships.filter((r) => r.fromPersonId !== personId && r.toPersonId !== personId),
    }));
    setSelectedId(null);
    try {
      const res = await fetch(`/api/people/${personId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast("Person removed");
      router.refresh();
    } catch {
      setGraph(snapshot);
      toast("Could not remove this person", "error");
    }
  }

  function tracePathTo(personId: string) {
    if (!me) return;
    const path = findPath(graph.relationships, me.id, personId);
    if (!path) {
      toast("No relationship path from you to this person yet.", "info");
      return;
    }
    setPathIds(path);
    setFocusMode(false);
    toast(`Path found in ${path.length - 1} hop${path.length - 1 === 1 ? "" : "s"}`, "info");
  }

  const selectedPerson = graph.people.find((p) => p.id === selectedId) ?? null;
  const peopleCount = graph.people.filter((p) => !p.isMe).length;

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] flex-col overflow-hidden lg:h-dvh">
      {/* Header */}
      <header className="z-20 flex shrink-0 items-center gap-2 border-b border-line/60 bg-surface/70 px-3 py-2.5 backdrop-blur sm:px-4">
        <Link
          href="/spaces"
          aria-label="Back to spaces"
          className="flex size-9 items-center justify-center rounded-xl text-muted transition hover:bg-elevated hover:text-ink lg:hidden"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-xl text-base"
          style={{ backgroundColor: `${graph.space.color}22`, border: `1px solid ${graph.space.color}66` }}
        >
          {graph.space.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold leading-tight sm:text-base">{graph.space.name}</h1>
          <p className="truncate text-[11px] text-muted">
            {peopleCount} {peopleCount === 1 ? "person" : "people"} · {graph.relationships.length} connections
          </p>
        </div>

        <div className="relative hidden items-center md:flex">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, tags…"
            className="h-9 w-56 pl-9 text-xs"
            aria-label="Search people in this space"
          />
        </div>

        <Segmented
          value={viewMode}
          onChange={(v) => {
            setViewMode(v);
            setPathIds(null);
          }}
          options={[
            { value: "circle", label: "Circle", icon: <CircleIcon className="size-3.5" /> },
            { value: "tree", label: "Tree", icon: <GitBranch className="size-3.5" /> },
          ]}
        />

        <Button
          size="sm"
          className="hidden sm:inline-flex"
          icon={<UserPlus className="size-4" />}
          onClick={() => setShowAdd(true)}
        >
          Add person
        </Button>
      </header>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 cm-aurora">
          <div className="absolute inset-0 cm-grid opacity-40" aria-hidden />
          {peopleCount === 0 ? (
            <EmptySpaceState onAdd={() => setShowAdd(true)} name={me?.name ?? "You"} avatar={me?.avatarUrl ?? null} />
          ) : (
            <GraphCanvas
              people={graph.people}
              relationships={graph.relationships}
              positions={positions[viewMode]}
              viewMode={viewMode}
              selectedId={selectedId}
              focusMode={focusMode}
              pathIds={pathIds}
              dimmedIds={dimmedIds}
              connectSourceId={connectFrom}
              onSelect={(id) => {
                setSelectedId(id);
                if (!id) setPathIds(null);
              }}
              onMove={handleMove}
              onEdgeSelect={(edge) => setEditEdge(edge)}
              onToggleFocus={() => {
                setPathIds(null);
                setFocusMode((f) => !f);
              }}
            />
          )}

          {pathIds && (
            <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-highlight/50 bg-surface/90 px-3 py-1.5 text-[11px] text-pink-200 backdrop-blur">
              <Sparkles className="size-3.5" />
              Tracing path · {pathIds.length - 1} hops
              <button onClick={() => setPathIds(null)} aria-label="Clear path" className="text-muted hover:text-ink">
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Mobile FAB */}
          <button
            onClick={() => setShowAdd(true)}
            aria-label="Add a person"
            className="absolute bottom-5 left-4 z-10 flex size-12 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-white shadow-[0_14px_40px_-12px_rgba(99,102,241,1)] transition active:scale-95 sm:hidden"
          >
            <Plus className="size-6" />
          </button>
        </div>

        {selectedPerson && (
          <PersonPanel
            key={selectedPerson.id}
            personId={selectedPerson.id}
            spacePeople={graph.people}
            relationships={graph.relationships}
            onClose={() => setSelectedId(null)}
            onOpenPerson={(id) => setSelectedId(id)}
            onConnect={createRelationship}
            onDeleteRelationship={(edge) => setDeleteEdge(edge)}
            onDeletePerson={removePerson}
            onTracePath={tracePathTo}
            onPersonChanged={refresh}
          />
        )}
      </div>

      <AddPersonDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreate={createPerson}
        spaceName={graph.space.name}
      />

      <EditEdgeDialog
        edge={editEdge}
        people={graph.people}
        onClose={() => setEditEdge(null)}
        onSave={saveEdgeLabel}
        onDelete={(edge) => {
          setEditEdge(null);
          setDeleteEdge(edge);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteEdge)}
        title="Remove this connection?"
        body="Only the relationship is removed. Both people, their profiles, media and memories stay exactly as they are."
        confirmLabel="Remove connection"
        loading={busy}
        onCancel={() => setDeleteEdge(null)}
        onConfirm={() => deleteEdge && removeRelationship(deleteEdge)}
      />
    </div>
  );
}

function EmptySpaceState({
  onAdd,
  name,
  avatar,
}: {
  onAdd: () => void;
  name: string;
  avatar: string | null;
}) {
  return (
    <div className="relative flex size-full flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-7 flex size-40 items-center justify-center">
        <span className="absolute size-40 rounded-full border border-primary/25 cm-pulse-ring" />
        <span className="absolute size-28 rounded-full border border-primary/40" />
        <span className="absolute size-40 rounded-full bg-primary/10 blur-2xl" />
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="size-20 rounded-full object-cover ring-2 ring-primary" />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-2xl font-semibold text-white ring-2 ring-primary/60">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <h2 className="text-xl font-semibold">You are the center of this Space.</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        Start building your circle by adding someone. You can connect them to each other later — not just to you.
      </p>
      <Button className="mt-6" size="lg" icon={<Plus className="size-4" />} onClick={onAdd}>
        Add your first person
      </Button>
    </div>
  );
}

function AddPersonDialog({
  open,
  onClose,
  onCreate,
  spaceName,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; relationshipToMe: string; tags: string[] }) => Promise<string | undefined>;
  spaceName: string;
}) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setRelationship("");
    setTags([]);
    setTagInput("");
    setError(null);
  }

  async function submit() {
    if (name.trim().length < 1) {
      setError("A name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), relationshipToMe: relationship.trim(), tags });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add this person.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay open={open} onClose={onClose} title="Add a person">
      <p className="-mt-2 mb-4 text-xs text-muted">They will be added to {spaceName}.</p>
      <div className="space-y-4">
        <div>
          <Label htmlFor="person-name">Name</Label>
          <Input id="person-name" autoFocus value={name} placeholder="Priya" onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="person-rel">Relationship to me</Label>
          <Input
            id="person-rel"
            value={relationship}
            placeholder="Cousin"
            onChange={(e) => setRelationship(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RELATIONSHIP_SUGGESTIONS.slice(0, 8).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRelationship(s)}
                className="rounded-full border border-line/70 px-2.5 py-1 text-[11px] text-muted transition hover:border-primary/60 hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted/70">
            Free-form — write any label. Leaving it blank adds them without a link to you.
          </p>
        </div>
        <div>
          <Label htmlFor="person-tags">Tags</Label>
          <div className="flex gap-2">
            <Input
              id="person-tags"
              value={tagInput}
              placeholder="Close, Delhi, Work…"
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  e.preventDefault();
                  setTags((t) => [...new Set([...t, tagInput.trim()])]);
                  setTagInput("");
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (!tagInput.trim()) return;
                setTags((t) => [...new Set([...t, tagInput.trim()])]);
                setTagInput("");
              }}
            >
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Tag key={t} onRemove={() => setTags((prev) => prev.filter((x) => x !== t))}>
                  {t}
                </Tag>
              ))}
            </div>
          )}
        </div>
        <FieldError>{error}</FieldError>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit} icon={<UserPlus className="size-4" />}>
            Add Person
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

function EditEdgeDialog({
  edge,
  people,
  onClose,
  onSave,
  onDelete,
}: {
  edge: EdgeView | null;
  people: SpaceGraphView["people"];
  onClose: () => void;
  onSave: (edge: EdgeView, label: string, type: "mutual" | "directional") => void;
  onDelete: (edge: EdgeView) => void;
}) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"mutual" | "directional">("mutual");

  useEffect(() => {
    if (edge) {
      setLabel(edge.label);
      setType(edge.type);
    }
  }, [edge]);

  if (!edge) return null;
  const from = people.find((p) => p.id === edge.fromPersonId);
  const to = people.find((p) => p.id === edge.toPersonId);

  return (
    <Overlay open onClose={onClose} title="Edit relationship">
      <div className="mb-4 flex items-center justify-center gap-3 rounded-2xl border border-line/60 bg-surface/50 p-3 text-sm">
        <span className="font-medium">{from?.name}</span>
        <span className={cx("text-muted", type === "directional" && "text-highlight")}>
          {type === "directional" ? "→" : "↔"}
        </span>
        <span className="font-medium">{to?.name}</span>
      </div>
      <Label htmlFor="edge-label">Relationship label</Label>
      <Input id="edge-label" value={label} onChange={(e) => setLabel(e.target.value)} />
      <div className="mt-4">
        <Label>Direction</Label>
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "mutual", label: "Mutual ↔" },
            { value: "directional", label: "Directional →" },
          ]}
        />
      </div>
      <div className="mt-6 flex items-center justify-between gap-2">
        <Button variant="ghost" className="text-danger hover:bg-danger/10" onClick={() => onDelete(edge)}>
          Remove
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(edge, label.trim() || edge.label, type)} icon={<Link2 className="size-4" />}>
            Save
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
