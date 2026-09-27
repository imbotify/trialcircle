"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Layers, LogOut, Shield, Trash2, UserCog } from "lucide-react";
import {
  Avatar,
  Button,
  ConfirmDialog,
  FieldError,
  Input,
  Label,
  Textarea,
  useToast,
} from "@/components/ui";
import type { AccountView, SpaceSummaryView } from "@/lib/types";

export default function SettingsClient({
  user,
  spaces,
}: {
  user: AccountView;
  spaces: SpaceSummaryView[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio, avatarUrl }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not save your profile.");
      }
      toast("Profile saved");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.replace("/login");
      router.refresh();
    } catch {
      toast("Could not delete the account", "error");
      setDeleting(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh cm-aurora">
      <div className="mx-auto w-full max-w-3xl space-y-5 px-5 py-7 sm:px-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
          <p className="mt-1.5 text-sm text-muted">Your account, your spaces, your data.</p>
        </header>

        <section className="rounded-2xl p-5 cm-card">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <UserCog className="size-4 text-primary" /> Account profile
          </h2>
          <div className="flex items-start gap-4">
            <Avatar name={displayName || user.email} src={avatarUrl || null} size={64} />
            <div className="flex-1 space-y-3">
              <div>
                <Label htmlFor="name">Display name</Label>
                <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="avatar">Photo URL</Label>
                <Input id="avatar" value={avatarUrl} placeholder="https://…" onChange={(e) => setAvatarUrl(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="bio">About me</Label>
                <Textarea id="bio" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A line about you" />
              </div>
              <FieldError>{error}</FieldError>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted">{user.email}</p>
                <Button loading={saving} onClick={saveProfile}>
                  Save profile
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl p-5 cm-card">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Layers className="size-4 text-secondary" /> Spaces ({spaces.length})
          </h2>
          <div className="space-y-1.5">
            {spaces.length === 0 && <p className="text-xs text-muted">No spaces yet.</p>}
            {spaces.map((s) => (
              <Link
                key={s.id}
                href={`/spaces/${s.id}`}
                className="flex items-center gap-3 rounded-xl border border-line/50 p-2.5 transition hover:border-primary/50"
              >
                <span
                  className="flex size-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${s.color}22`, border: `1px solid ${s.color}55` }}
                >
                  {s.icon}
                </span>
                <span className="flex-1 truncate text-sm">{s.name}</span>
                <span className="text-[11px] text-muted">{s.peopleCount} people</span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted/80">Manage or delete individual spaces from My Spaces.</p>
        </section>

        <section className="rounded-2xl p-5 cm-card">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Shield className="size-4 text-accent" /> Privacy & data
          </h2>
          <p className="mb-4 text-xs leading-relaxed text-muted">
            Every request is checked against your session on the server — knowing an id is never enough to read a record.
            Uploaded media is stored privately and streamed only to you.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/account/export" download>
              <Button variant="secondary" icon={<Download className="size-4" />}>
                Export my data (JSON)
              </Button>
            </a>
            <Button variant="secondary" icon={<LogOut className="size-4" />} onClick={signOut}>
              Sign out
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-danger/40 bg-danger/5 p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-200">
            <Trash2 className="size-4" /> Danger zone
          </h2>
          <p className="mb-4 text-xs leading-relaxed text-muted">
            Deleting your account permanently removes every space, person, relationship, custom field, memory and file.
            There is no recovery.
          </p>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete my account
          </Button>
        </section>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete your account?"
        body="This erases all of your spaces, people, relationships, custom fields, memories and uploads immediately. This cannot be undone."
        confirmLabel="Delete everything"
        loading={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={deleteAccount}
      />
    </div>
  );
}
