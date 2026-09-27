# CircleMap — Phase 0 Audit & Architecture Decisions

## 1. Repository audit (before implementation)

| Area | Found |
| --- | --- |
| Framework | Next.js 16.2.6, App Router, React 19, TypeScript 5.9 (strict) |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss`, single `globals.css` |
| Database | Drizzle ORM 0.45 + `node-postgres` against local PostgreSQL (`DATABASE_URL`) |
| Schema | Empty (`src/db/schema.ts` exported nothing) |
| Auth | None |
| Storage | None |
| Graph | None |
| Routes | `/` placeholder page, `/api/health` |
| Package manager | npm |

Conclusion: functionally greenfield inside a starter template. Nothing had to be rewritten, so the
existing structure (App Router + Drizzle + Tailwind) was **extended**, per spec §90.

## 2. Product/architecture gaps vs. the blueprint

The blueprint specifies Supabase for Auth, Postgres+RLS, and Storage. This environment has plain
PostgreSQL and no Supabase project. Rather than silently dropping the guarantees, each Supabase
capability was replaced by a functional equivalent:

| Blueprint | Implemented here | Rationale |
| --- | --- | --- |
| Supabase Auth (email + OAuth) | Email/password with scrypt hashes, DB-backed sessions, HTTP-only `cm_session` cookie | No OAuth provider credentials exist in the sandbox; the auth surface (`/api/auth/[action]`) is provider-shaped so Google/Apple can be added without schema change |
| Row Level Security | A single server-side data-access layer (`src/lib/domain.ts`) where **every** read/write re-derives ownership from the session (`requireSpace` / `requirePerson` / `requireRelationship` / `requireField` / `requireMemory` / `requireMedia`) | Equivalent guarantee without a Postgres role per user; no query is ever issued without an ownership predicate |
| Supabase Storage + signed URLs | Private media rows in Postgres streamed through `/api/media/[id]` after an ownership check | Knowing a media UUID grants nothing (verified: 404 for another user, 401 anonymous) |
| React Flow | Custom SVG graph engine (`src/components/graph/GraphCanvas.tsx`) | Needed exact design-system fidelity (Me/person/selected/focused/inactive node states, mutual vs directional edges, parallel-edge fanning, contextual labels) plus first-class pointer/touch handling (drag, pan, pinch-zoom) with zero extra dependencies |

## 3. Decisions classified (spec §116)

**Safe assumptions (implemented):** cookie sessions; scrypt hashing; media size cap 4 MB and
allow-list of MIME types; auto-layout as a *fallback only*; hop-depth BFS for tree projection;
demo account seeding; new accounts receive one pre-populated starter space.

**Product decisions (implemented as specified in the blueprint, called out here):** Tree View and
All Connections are part of the current release (blueprint screens 8 and 15); path tracing is
exposed as a per-person "trace from you" action built on real edge data, never on screen positions.

**Architectural decisions (documented, non-reversible without migration):** relationships are
first-class rows keyed by `(space, from, to, label)` with a unique index that blocks exact duplicates
while allowing several distinct labels per pair; graph layout lives in its own table keyed by
`(space, view_mode, person)` and never carries semantics; the "Me" node is a `people` row with
`is_me = true` whose `name`/`avatar_url` are **nullable overrides** inherited from the account at
read time, so editing the account never clobbers a deliberate per-space override.

## 4. Core invariants enforced server-side

1. A relationship may only join two people in the **same** space (verified: HTTP 422).
2. Deleting a relationship removes the edge only — people, profiles, media and memories survive.
3. Deleting a person cascades to its relationships, fields, media, memories and layout rows (FK `on delete cascade`) — no orphans, no dangling edges.
4. The Me node cannot be deleted (HTTP 422); it anchors the space.
5. Duplicate connection submissions are idempotent (case-insensitive, direction-insensitive match returns the existing edge).
6. Names are never treated as identity — two people called "Priya" in different spaces stay separate.
7. Layout writes are debounced (~550 ms) and never mutate relationship data.

## 5. Known limitations / extension points

- OAuth providers, password recovery and email verification are not wired (no mail/OAuth provider in this environment).
- Media binaries live in Postgres; swapping in object storage only requires changing `createMedia`/`requireMedia`.
- Cross-space identity linking, clustering, hop-depth filters and relationship strength are deliberately **not** implemented; the schema leaves room for all of them.

## 6. Demo data

`demo@circlemap.app` / `circlemap` — four spaces (My Family, Work Circle, College Friends,
Neighbours), 18 people, 33 relationships including cross-connections that do not touch Me, a cycle,
directional edges, custom fields, tags and timeline memories.
