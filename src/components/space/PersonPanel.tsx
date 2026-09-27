"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  FileText,
  ImagePlus,
  Images,
  Link2,
  ListPlus,
  Pencil,
  Route,
  Trash2,
  Upload,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import {
  Avatar,
  Button,
  ConfirmDialog,
  EmptyState,
  FieldError,
  IconButton,
  Input,
  Label,
  Overlay,
  Segmented,
  Skeleton,
  Tag,
  Textarea,
  cx,
  useToast,
} from "@/components/ui";
import type { EdgeView, PersonDetailView, PersonView } from "@/lib/types";

type Tab = "info" | "media" | "timeline" | "connections";

export default function PersonPanel({
  personId,
  spacePeople,
  relationships,
  onClose,
  onOpenPerson,
  onConnect,
  onDeleteRelationship,
  onDeletePerson,
  onTracePath,
  onPersonChanged,
}: {
  personId: string;
  spacePeople: PersonView[];
  relationships: EdgeView[];
  onClose: () => void;
  onOpenPerson: (id: string) => void;
  onConnect: (from: string, to: string, label: string, type: "mutual" | "directional") => Promise<void>;
  onDeleteRelationship: (edge: EdgeView) => void;
  onDeletePerson: (id: string) => void;
  onTracePath: (id: string) => void;
  onPersonChanged: () => void;
}) {
  const toast = useToast();
  const [detail, setDetail] = useState<PersonDetailView | null>(null);
  const [tab, setTab] = useState<Tab>("info");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showConnect, setShowConnect] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/people/${personId}`);
    if (!res.ok) {
      toast("Could not load this profile", "error");
      return;
    }
    setDetail((await res.json()) as PersonDetailView);
  }, [personId, toast]);

  useEffect(() => {
    setDetail(null);
    void load();
  }, [load]);

  const person = detail?.person;

  return (
    <aside
      className="fixed inset-x-0 bottom-16 z-30 max-h-[78dvh] overflow-hidden rounded-t-3xl border border-line/70 cm-glass cm-sheet-up lg:static lg:bottom-0 lg:max-h-none lg:w-[400px] lg:shrink-0 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l lg:animate-none"
      aria-label="Person profile"
    >
      <div className="flex h-full max-h-[78dvh] flex-col lg:max-h-none lg:h-dvh">
        {!detail ? (
          <div className="space-y-4 p-5">
            <Skeleton className="h-28 w-full" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-16 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="relative shrink-0">
              <div
                className="h-24 w-full"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.35) 45%, rgba(6,182,212,0.3))",
                }}
              />
              <div className="absolute right-3 top-3 flex gap-2">
                {!person?.isMe && (
                  <IconButton label="Trace path from you" onClick={() => onTracePath(personId)}>
                    <Route className="size-4" />
                  </IconButton>
                )}
                <IconButton label="Close profile" onClick={onClose}>
                  <X className="size-4" />
                </IconButton>
              </div>
              <div className="-mt-10 px-5">
                <Avatar name={person!.name} src={person!.avatarUrl} size={76} ring={person!.isMe ? "#6366F1" : "#8B5CF6"} />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{person!.name}</h2>
                    <p className="text-xs text-muted">{person!.relationshipToMe ?? "No relationship set"}</p>
                  </div>
                  <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                </div>
                {person!.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {person!.tags.map((t) => (
                      <Tag key={t}>{t}</Tag>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-1 border-b border-line/60 px-3">
                {(["info", "media", "timeline", "connections"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    aria-current={tab === t}
                    className={cx(
                      "relative px-3 py-2.5 text-xs font-medium capitalize transition",
                      tab === t ? "text-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    {t}
                    {tab === t && (
                      <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-primary to-secondary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 cm-scroll">
              {tab === "info" && <InfoTab detail={detail} reload={load} onPersonChanged={onPersonChanged} />}
              {tab === "media" && <MediaTab detail={detail} reload={load} />}
              {tab === "timeline" && <TimelineTab detail={detail} reload={load} />}
              {tab === "connections" && (
                <ConnectionsTab
                  detail={detail}
                  relationships={relationships}
                  onOpenPerson={onOpenPerson}
                  onAdd={() => setShowConnect(true)}
                  onRemove={onDeleteRelationship}
                />
              )}
            </div>

            {!person!.isMe && (
              <div className="shrink-0 border-t border-line/60 p-3">
                <Button
                  variant="ghost"
                  className="w-full text-danger hover:bg-danger/10"
                  icon={<UserMinus className="size-4" />}
                  onClick={() => setConfirmDelete(true)}
                >
                  Remove {person!.name} from this space
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {detail && (
        <EditPersonDialog
          open={editing}
          detail={detail}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            void load();
            onPersonChanged();
          }}
        />
      )}

      {detail && (
        <ConnectDialog
          open={showConnect}
          person={detail.person}
          spacePeople={spacePeople}
          existing={detail.connections.map((c) => c.person.id)}
          onClose={() => setShowConnect(false)}
          onConnect={async (toId, label, type) => {
            await onConnect(personId, toId, label, type);
            await load();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={`Remove ${person?.name ?? "this person"}?`}
        body="This deletes their profile, custom fields, media, memories and every connection they are part of. This cannot be undone."
        confirmLabel="Remove person"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          onDeletePerson(personId);
        }}
      />
    </aside>
  );
}

/* -------------------------------------------------- info tab */

function InfoTab({
  detail,
  reload,
  onPersonChanged,
}: {
  detail: PersonDetailView;
  reload: () => Promise<void>;
  onPersonChanged: () => void;
}) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ label: "", value: "" });
  const [busy, setBusy] = useState(false);

  async function addField() {
    if (!label.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/people/${detail.person.id}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, value }),
      });
      if (!res.ok) throw new Error();
      setLabel("");
      setValue("");
      setAdding(false);
      await reload();
      onPersonChanged();
      toast("Field added");
    } catch {
      toast("Could not add the field", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveField(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/items/field/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) throw new Error();
      setEditingId(null);
      await reload();
      toast("Field updated");
    } catch {
      toast("Could not update the field", "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeField(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/items/field/${id}`, { method: "DELETE" });
      await reload();
      toast("Field deleted");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const ids = detail.fields.map((f) => f.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await fetch(`/api/people/${detail.person.id}/fields`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: ids }),
    });
    await reload();
  }

  return (
    <div className="space-y-3">
      {detail.fields.length === 0 && !adding ? (
        <EmptyState
          compact
          icon={<ListPlus className="size-5" />}
          title="No details yet"
          body="Add anything you want to remember — phone, birthday, how you met, favourite food."
          action={
            <Button size="sm" onClick={() => setAdding(true)} icon={<ListPlus className="size-3.5" />}>
              Add a field
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line/60">
          {detail.fields.map((field, index) => (
            <div key={field.id} className="group border-b border-line/40 last:border-0">
              {editingId === field.id ? (
                <div className="space-y-2 p-3">
                  <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Field name" />
                  <Input value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} placeholder="Value" />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button size="sm" loading={busy} onClick={() => saveField(field.id)} icon={<Check className="size-3.5" />}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-wide text-muted/70">{field.label}</p>
                    <p className="truncate text-sm text-ink">{field.value || "—"}</p>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      aria-label={`Move ${field.label} up`}
                      onClick={() => move(index, -1)}
                      className="rounded-md p-1.5 text-muted hover:bg-elevated hover:text-ink"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      aria-label={`Move ${field.label} down`}
                      onClick={() => move(index, 1)}
                      className="rounded-md p-1.5 text-muted hover:bg-elevated hover:text-ink"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button
                      aria-label={`Edit ${field.label}`}
                      onClick={() => {
                        setEditingId(field.id);
                        setDraft({ label: field.label, value: field.value });
                      }}
                      className="rounded-md p-1.5 text-muted hover:bg-elevated hover:text-ink"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      aria-label={`Delete ${field.label}`}
                      onClick={() => removeField(field.id)}
                      className="rounded-md p-1.5 text-muted hover:bg-danger/15 hover:text-danger"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="space-y-2 rounded-2xl border border-line/60 p-3">
          <Label htmlFor="new-field">Add new field</Label>
          <Input id="new-field" autoFocus value={label} placeholder="Field name (e.g. Favourite Movie)" onChange={(e) => setLabel(e.target.value)} />
          <Input value={value} placeholder="Field value" onChange={(e) => setValue(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={busy} onClick={addField}>
              Add
            </Button>
          </div>
        </div>
      ) : (
        detail.fields.length > 0 && (
          <Button variant="secondary" size="sm" className="w-full" icon={<ListPlus className="size-3.5" />} onClick={() => setAdding(true)}>
            Add Field
          </Button>
        )
      )}
    </div>
  );
}

/* -------------------------------------------------- media tab */

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function MediaTab({ detail, reload }: { detail: PersonDetailView; reload: () => Promise<void> }) {
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const photos = detail.media.filter((m) => m.kind === "photo");
  const docs = detail.media.filter((m) => m.kind === "document");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 6)) {
        if (file.size > 4 * 1024 * 1024) {
          toast(`${file.name} is larger than 4 MB`, "error");
          continue;
        }
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("read failed"));
          reader.readAsDataURL(file);
        });
        const res = await fetch(`/api/people/${detail.person.id}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type, data }),
        });
        if (!res.ok) {
          const body = (await res.json()) as { error?: string };
          throw new Error(body.error ?? "Upload failed");
        }
      }
      await reload();
      toast("Upload complete");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: string) {
    await fetch(`/api/items/media/${id}`, { method: "DELETE" });
    await reload();
    toast("File deleted");
  }

  return (
    <div className="space-y-5">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,text/csv"
        className="hidden"
        onChange={(e) => upload(e.target.files)}
      />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Photos ({photos.length})</h3>
          <Button size="sm" variant="secondary" loading={uploading} icon={<ImagePlus className="size-3.5" />} onClick={() => inputRef.current?.click()}>
            Add
          </Button>
        </div>
        {photos.length === 0 ? (
          <EmptyState compact icon={<Images className="size-5" />} title="No photos yet" body="Private to you. Upload JPG, PNG or WEBP up to 4 MB." />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((m) => (
              <div key={m.id} className="group relative aspect-square overflow-hidden rounded-xl border border-line/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.caption ?? m.fileName} loading="lazy" className="size-full object-cover" onClick={() => setPreview(m.url)} />
                <button
                  aria-label={`Delete ${m.fileName}`}
                  onClick={() => remove(m.id)}
                  className="absolute right-1 top-1 rounded-lg bg-bg/80 p-1 text-muted opacity-0 transition hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Documents ({docs.length})</h3>
          <Button size="sm" variant="secondary" icon={<Upload className="size-3.5" />} onClick={() => inputRef.current?.click()}>
            Add
          </Button>
        </div>
        {docs.length === 0 ? (
          <EmptyState compact icon={<FileText className="size-5" />} title="No documents" body="Keep PDFs or notes that belong to this person." />
        ) : (
          <div className="space-y-2">
            {docs.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line/60 p-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg bg-danger/15 text-danger">
                  <FileText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{m.fileName}</p>
                  <p className="text-[11px] text-muted">
                    {formatBytes(m.sizeBytes)} · {new Date(m.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <a href={m.url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-muted hover:text-ink" aria-label={`Open ${m.fileName}`}>
                  <Upload className="size-3.5 rotate-180" />
                </a>
                <button aria-label={`Delete ${m.fileName}`} onClick={() => remove(m.id)} className="rounded-lg p-1.5 text-muted hover:text-danger">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Overlay open={Boolean(preview)} onClose={() => setPreview(null)} title="Photo" wide>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="w-full rounded-xl" />
        )}
      </Overlay>
    </div>
  );
}

/* -------------------------------------------------- timeline tab */

function TimelineTab({ detail, reload }: { detail: PersonDetailView; reload: () => Promise<void> }) {
  const toast = useToast();
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", eventDate: new Date().toISOString().slice(0, 10), icon: "✨" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = [...detail.memories].sort((a, b) =>
    order === "newest" ? b.eventDate.localeCompare(a.eventDate) : a.eventDate.localeCompare(b.eventDate),
  );

  async function save() {
    if (!form.title.trim()) {
      setError("A title is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editId ? `/api/items/memory/${editId}` : `/api/people/${detail.person.id}/memories`, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not save the memory.");
      }
      setOpen(false);
      setEditId(null);
      setForm({ title: "", description: "", eventDate: new Date().toISOString().slice(0, 10), icon: "✨" });
      await reload();
      toast("Memory saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the memory.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/items/memory/${id}`, { method: "DELETE" });
    await reload();
    toast("Memory deleted");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Timeline ({detail.memories.length})</h3>
        <div className="flex items-center gap-2">
          <Segmented
            size="sm"
            value={order}
            onChange={setOrder}
            options={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
            ]}
          />
          <Button size="sm" icon={<CalendarDays className="size-3.5" />} onClick={() => setOpen(true)}>
            Add
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          compact
          icon={<CalendarDays className="size-5" />}
          title="No memories yet"
          body="Capture moments — a call, a trip, a milestone — so the context never fades."
        />
      ) : (
        <ol className="relative space-y-3 border-l border-line/60 pl-5">
          {sorted.map((memory) => (
            <li key={memory.id} className="group relative">
              <span className="absolute -left-[26px] flex size-6 items-center justify-center rounded-full border border-line/70 bg-surface text-[11px]">
                {memory.icon}
              </span>
              <div className="rounded-xl border border-line/50 bg-surface/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-muted">
                      {new Date(memory.eventDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="mt-0.5 text-sm font-medium">{memory.title}</p>
                  </div>
                  <div className="flex shrink-0 gap-0.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      aria-label={`Edit ${memory.title}`}
                      className="rounded-md p-1.5 text-muted hover:text-ink"
                      onClick={() => {
                        setEditId(memory.id);
                        setForm({
                          title: memory.title,
                          description: memory.description ?? "",
                          eventDate: memory.eventDate,
                          icon: memory.icon,
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button aria-label={`Delete ${memory.title}`} className="rounded-md p-1.5 text-muted hover:text-danger" onClick={() => remove(memory.id)}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                {memory.description && <p className="mt-1.5 text-xs leading-relaxed text-muted">{memory.description}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}

      <Overlay
        open={open}
        onClose={() => {
          setOpen(false);
          setEditId(null);
        }}
        title={editId ? "Edit memory" : "Add a memory"}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="memory-date">Date</Label>
            <Input id="memory-date" type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="memory-title">Title</Label>
            <Input id="memory-title" value={form.title} placeholder="Last phone call" onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="memory-desc">Description</Label>
            <Textarea
              id="memory-desc"
              rows={3}
              value={form.description}
              placeholder="Had a long conversation about her new job."
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {["✨", "📞", "🎂", "🚗", "🎓", "🍲", "🎉", "💼"].map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className={cx(
                    "flex size-9 items-center justify-center rounded-xl border transition",
                    form.icon === icon ? "border-primary bg-primary/15" : "border-line/70",
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>
          <FieldError>{error}</FieldError>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                setEditId(null);
              }}
            >
              Cancel
            </Button>
            <Button loading={saving} onClick={save}>
              Save Memory
            </Button>
          </div>
        </div>
      </Overlay>
    </div>
  );
}

/* -------------------------------------------------- connections tab */

function ConnectionsTab({
  detail,
  relationships,
  onOpenPerson,
  onAdd,
  onRemove,
}: {
  detail: PersonDetailView;
  relationships: EdgeView[];
  onOpenPerson: (id: string) => void;
  onAdd: () => void;
  onRemove: (edge: EdgeView) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Connected people ({detail.connections.length})
        </h3>
        <Button size="sm" icon={<Link2 className="size-3.5" />} onClick={onAdd}>
          Connect
        </Button>
      </div>

      {detail.connections.length === 0 ? (
        <EmptyState
          compact
          icon={<Users className="size-5" />}
          title="Not connected to anyone yet"
          body="Connections are real graph edges — link this person to anyone else in the space."
          action={
            <Button size="sm" onClick={onAdd} icon={<Link2 className="size-3.5" />}>
              Connect to someone
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {detail.connections.map((c) => {
            const edge = relationships.find((r) => r.id === c.relationshipId);
            return (
              <div key={c.relationshipId} className="group flex items-center gap-3 rounded-xl border border-line/60 p-2.5">
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => onOpenPerson(c.person.id)}>
                  <Avatar name={c.person.name} src={c.person.avatarUrl} size={36} ring="#8B5CF6" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.person.name}</p>
                    <p className="truncate text-[11px] text-muted">
                      {c.type === "directional" ? (c.direction === "outgoing" ? "→ " : "← ") : "↔ "}
                      {c.label}
                    </p>
                  </div>
                </button>
                {edge && (
                  <button
                    aria-label={`Remove connection with ${c.person.name}`}
                    onClick={() => onRemove(edge)}
                    className="shrink-0 rounded-lg p-1.5 text-muted opacity-0 transition hover:text-danger group-hover:opacity-100 focus:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------- dialogs */

function EditPersonDialog({
  open,
  detail,
  onClose,
  onSaved,
}: {
  open: boolean;
  detail: PersonDetailView;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(detail.person.name);
  const [relationship, setRelationship] = useState(detail.person.relationshipToMe ?? "");
  const [avatarUrl, setAvatarUrl] = useState(detail.person.avatarUrl ?? "");
  const [tags, setTags] = useState<string[]>(detail.person.tags);
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { name, avatarUrl, tags };
      if (!detail.person.isMe) payload.relationshipToMe = relationship;
      const res = await fetch(`/api/people/${detail.person.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not save.");
      }
      toast("Profile updated");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay open={open} onClose={onClose} title="Edit profile">
      <div className="space-y-3">
        <div>
          <Label htmlFor="edit-name">Name</Label>
          <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          {detail.person.isMe && (
            <p className="mt-1.5 text-[11px] text-muted/80">
              This only overrides how you appear in this space. Your account name stays unchanged.
            </p>
          )}
        </div>
        {!detail.person.isMe && (
          <div>
            <Label htmlFor="edit-rel">Relationship to me</Label>
            <Input id="edit-rel" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
          </div>
        )}
        <div>
          <Label htmlFor="edit-avatar">Photo URL</Label>
          <Input id="edit-avatar" value={avatarUrl} placeholder="https://…" onChange={(e) => setAvatarUrl(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit-tags">Tags</Label>
          <div className="flex gap-2">
            <Input
              id="edit-tags"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag"
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
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Tag key={t} onRemove={() => setTags((prev) => prev.filter((x) => x !== t))}>
                {t}
              </Tag>
            ))}
          </div>
        </div>
        <FieldError>{error}</FieldError>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            Save changes
          </Button>
        </div>
      </div>
    </Overlay>
  );
}

function ConnectDialog({
  open,
  person,
  spacePeople,
  existing,
  onClose,
  onConnect,
}: {
  open: boolean;
  person: PersonView;
  spacePeople: PersonView[];
  existing: string[];
  onClose: () => void;
  onConnect: (toId: string, label: string, type: "mutual" | "directional") => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"mutual" | "directional">("mutual");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const candidates = spacePeople
    .filter((p) => p.id !== person.id)
    .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  async function submit() {
    if (!targetId) {
      setError("Choose who to connect to.");
      return;
    }
    if (!label.trim()) {
      setError("Describe the relationship.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConnect(targetId, label.trim(), type);
      setTargetId(null);
      setLabel("");
      setSearch("");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay open={open} onClose={onClose} title={`Connect ${person.name}`}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="connect-search">Select a person in this space</Label>
          <Input id="connect-search" value={search} placeholder="Search people…" onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-line/60 p-1.5 cm-scroll">
          {candidates.length === 0 && <p className="p-3 text-xs text-muted">No one else in this space yet.</p>}
          {candidates.map((p) => (
            <button
              key={p.id}
              onClick={() => setTargetId(p.id)}
              className={cx(
                "flex w-full items-center gap-3 rounded-lg p-2 text-left transition",
                targetId === p.id ? "bg-primary/15 ring-1 ring-primary/50" : "hover:bg-elevated/60",
              )}
            >
              <Avatar name={p.name} src={p.avatarUrl} size={32} ring={p.isMe ? "#6366F1" : "#8B5CF6"} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{p.name}</p>
                <p className="truncate text-[11px] text-muted">{p.relationshipToMe ?? "—"}</p>
              </div>
              {existing.includes(p.id) && <span className="text-[10px] text-muted">already linked</span>}
            </button>
          ))}
        </div>
        <div>
          <Label htmlFor="connect-label">Relationship label</Label>
          <Input id="connect-label" value={label} placeholder="Childhood Friends" onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <Label>Type</Label>
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: "mutual", label: "Mutual ↔" },
              { value: "directional", label: "Directional →" },
            ]}
          />
        </div>
        <FieldError>{error}</FieldError>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={submit} icon={<Link2 className="size-4" />}>
            Create Connection
          </Button>
        </div>
      </div>
    </Overlay>
  );
}
