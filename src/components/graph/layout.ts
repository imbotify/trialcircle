import type { EdgeView, PersonView, ViewMode } from "@/lib/types";

export type Point = { x: number; y: number };

/**
 * Automatic layout is only ever a *fallback* for nodes the user has not
 * positioned. Persisted positions always win (spec §78).
 */
export function autoLayout(
  people: PersonView[],
  edges: EdgeView[],
  mode: ViewMode,
): Record<string, Point> {
  const me = people.find((p) => p.isMe);
  const adjacency = new Map<string, Set<string>>();
  for (const p of people) adjacency.set(p.id, new Set());
  for (const e of edges) {
    adjacency.get(e.fromPersonId)?.add(e.toPersonId);
    adjacency.get(e.toPersonId)?.add(e.fromPersonId);
  }

  // BFS hop depth from Me (handles cycles + disconnected subgraphs).
  const depth = new Map<string, number>();
  if (me) {
    depth.set(me.id, 0);
    const queue = [me.id];
    while (queue.length) {
      const current = queue.shift() as string;
      const d = depth.get(current) ?? 0;
      for (const next of adjacency.get(current) ?? []) {
        if (!depth.has(next)) {
          depth.set(next, d + 1);
          queue.push(next);
        }
      }
    }
  }

  const positions: Record<string, Point> = {};

  if (mode === "circle") {
    const rings = new Map<number, string[]>();
    for (const p of people) {
      if (p.isMe) continue;
      const d = depth.get(p.id) ?? 99;
      const ring = d === 99 ? 3 : d;
      if (!rings.has(ring)) rings.set(ring, []);
      rings.get(ring)!.push(p.id);
    }
    if (me) positions[me.id] = { x: 0, y: 0 };
    for (const [ring, ids] of rings) {
      const radius = 200 + (ring - 1) * 185;
      const step = (Math.PI * 2) / Math.max(ids.length, 1);
      ids.forEach((id, i) => {
        const angle = i * step - Math.PI / 2 + (ring % 2 ? 0 : step / 2);
        positions[id] = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      });
    }
    return positions;
  }

  // Tree projection: hop depth becomes a level; siblings spread horizontally.
  const levels = new Map<number, string[]>();
  for (const p of people) {
    const d = p.isMe ? 0 : depth.get(p.id) ?? 99;
    const level = d === 99 ? (depth.size ? Math.max(...depth.values()) + 1 : 1) : d;
    if (!levels.has(level)) levels.set(level, []);
    levels.get(level)!.push(p.id);
  }
  const sorted = [...levels.keys()].sort((a, b) => a - b);
  for (const level of sorted) {
    const ids = levels.get(level)!;
    const spread = 210;
    const totalWidth = (ids.length - 1) * spread;
    ids.forEach((id, i) => {
      positions[id] = { x: i * spread - totalWidth / 2, y: level * 190 - 180 };
    });
  }
  return positions;
}

/** Neighbour set used for focus mode and profile connection lists. */
export function neighboursOf(edges: EdgeView[], personId: string): Set<string> {
  const set = new Set<string>();
  for (const e of edges) {
    if (e.fromPersonId === personId) set.add(e.toPersonId);
    if (e.toPersonId === personId) set.add(e.fromPersonId);
  }
  return set;
}

/** Shortest relationship path between two people (BFS over real edges). */
export function findPath(edges: EdgeView[], fromId: string, toId: string): string[] | null {
  if (fromId === toId) return [fromId];
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    if (!adjacency.has(e.fromPersonId)) adjacency.set(e.fromPersonId, []);
    if (!adjacency.has(e.toPersonId)) adjacency.set(e.toPersonId, []);
    adjacency.get(e.fromPersonId)!.push(e.toPersonId);
    adjacency.get(e.toPersonId)!.push(e.fromPersonId);
  }
  const prev = new Map<string, string | null>([[fromId, null]]);
  const queue = [fromId];
  while (queue.length) {
    const current = queue.shift() as string;
    if (current === toId) break;
    for (const next of adjacency.get(current) ?? []) {
      if (!prev.has(next)) {
        prev.set(next, current);
        queue.push(next);
      }
    }
  }
  if (!prev.has(toId)) return null;
  const path: string[] = [];
  let cursor: string | null = toId;
  while (cursor) {
    path.unshift(cursor);
    cursor = prev.get(cursor) ?? null;
  }
  return path;
}
