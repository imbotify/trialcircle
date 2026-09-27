"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import type { EdgeView, PersonView, ViewMode } from "@/lib/types";
import { autoLayout, neighboursOf, type Point } from "@/components/graph/layout";
import { IconButton } from "@/components/ui";

type Props = {
  people: PersonView[];
  relationships: EdgeView[];
  positions: Record<string, Point>;
  viewMode: ViewMode;
  selectedId: string | null;
  focusMode: boolean;
  pathIds?: string[] | null;
  dimmedIds?: Set<string> | null;
  connectSourceId?: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number, committed: boolean) => void;
  onEdgeSelect?: (edge: EdgeView) => void;
  onToggleFocus?: () => void;
};

const NODE_R = 34;
const ME_R = 46;

type Transform = { x: number; y: number; k: number };

export default function GraphCanvas({
  people,
  relationships,
  positions,
  viewMode,
  selectedId,
  focusMode,
  pathIds,
  dimmedIds,
  connectSourceId,
  onSelect,
  onMove,
  onEdgeSelect,
  onToggleFocus,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, k: 1 });
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const panState = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const pinchState = useRef<{ dist: number; k: number; cx: number; cy: number } | null>(null);
  const dragState = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);

  const auto = useMemo(() => autoLayout(people, relationships, viewMode), [people, relationships, viewMode]);
  const resolved = useMemo(() => {
    const out: Record<string, Point> = {};
    for (const p of people) out[p.id] = positions[p.id] ?? auto[p.id] ?? { x: 0, y: 0 };
    return out;
  }, [people, positions, auto]);

  const neighbours = useMemo(
    () => (selectedId ? neighboursOf(relationships, selectedId) : new Set<string>()),
    [relationships, selectedId],
  );

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - transform.x) / transform.k,
        y: (clientY - rect.top - transform.y) / transform.k,
      };
    },
    [transform],
  );

  const fitView = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || !people.length) return;
    const pts = people.map((p) => resolved[p.id]);
    const minX = Math.min(...pts.map((p) => p.x)) - 110;
    const maxX = Math.max(...pts.map((p) => p.x)) + 110;
    const minY = Math.min(...pts.map((p) => p.y)) - 110;
    const maxY = Math.max(...pts.map((p) => p.y)) + 110;
    const k = Math.min(rect.width / Math.max(maxX - minX, 1), rect.height / Math.max(maxY - minY, 1), 1.4);
    const clamped = Math.max(0.2, Math.min(k, 1.4));
    setTransform({
      k: clamped,
      x: rect.width / 2 - ((minX + maxX) / 2) * clamped,
      y: rect.height / 2 - ((minY + maxY) / 2) * clamped,
    });
  }, [people, resolved]);

  // Fit once per space/view-mode change.
  const fitKey = `${viewMode}:${people.length ? people[0]?.spaceId : "none"}`;
  const lastFit = useRef<string>("");
  useEffect(() => {
    if (lastFit.current === fitKey) return;
    lastFit.current = fitKey;
    const id = window.setTimeout(fitView, 60);
    return () => window.clearTimeout(id);
  }, [fitKey, fitView]);

  const zoomBy = useCallback((factor: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTransform((t) => {
      const k = Math.max(0.2, Math.min(2.6, t.k * factor));
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      return { k, x: cx - ((cx - t.x) / t.k) * k, y: cy - ((cy - t.y) / t.k) * k };
    });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setTransform((t) => {
      const k = Math.max(0.2, Math.min(2.6, t.k * (e.deltaY > 0 ? 0.92 : 1.08)));
      return { k, x: px - ((px - t.x) / t.k) * k, y: py - ((py - t.y) / t.k) * k };
    });
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchState.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        k: transform.k,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
      };
      panState.current = null;
      dragState.current = null;
      setDragId(null);
      return;
    }
    const nodeId = (e.target as Element).closest("[data-node-id]")?.getAttribute("data-node-id");
    if (nodeId) {
      const world = toWorld(e.clientX, e.clientY);
      const pos = resolved[nodeId];
      dragState.current = { id: nodeId, dx: world.x - pos.x, dy: world.y - pos.y, moved: false };
      setDragId(nodeId);
    } else {
      panState.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchState.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ratio = dist / (pinchState.current.dist || 1);
      const k = Math.max(0.2, Math.min(2.6, pinchState.current.k * ratio));
      const px = pinchState.current.cx - rect.left;
      const py = pinchState.current.cy - rect.top;
      setTransform((t) => ({ k, x: px - ((px - t.x) / t.k) * k, y: py - ((py - t.y) / t.k) * k }));
      return;
    }

    if (dragState.current) {
      const world = toWorld(e.clientX, e.clientY);
      const { id, dx, dy } = dragState.current;
      dragState.current.moved = true;
      onMove(id, Math.round(world.x - dx), Math.round(world.y - dy), false);
      return;
    }

    if (panState.current) {
      const { x, y, tx, ty } = panState.current;
      setTransform((t) => ({ ...t, x: tx + (e.clientX - x), y: ty + (e.clientY - y) }));
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchState.current = null;
    const drag = dragState.current;
    if (drag) {
      const pos = resolved[drag.id];
      if (drag.moved) onMove(drag.id, pos.x, pos.y, true);
      else onSelect(drag.id);
      dragState.current = null;
      setDragId(null);
      return;
    }
    if (panState.current) {
      const moved = Math.hypot(e.clientX - panState.current.x, e.clientY - panState.current.y) > 4;
      if (!moved) onSelect(null);
      panState.current = null;
    }
  };

  const showLabels = transform.k > 0.55;
  const pathSet = useMemo(() => new Set(pathIds ?? []), [pathIds]);

  const isDim = useCallback(
    (id: string) => {
      if (dimmedIds?.size) return dimmedIds.has(id);
      if (pathSet.size) return !pathSet.has(id);
      if (!focusMode || !selectedId) return false;
      return id !== selectedId && !neighbours.has(id);
    },
    [dimmedIds, focusMode, neighbours, pathSet, selectedId],
  );

  // Group parallel edges so multiple relationships between a pair stay readable.
  const edgeGroups = useMemo(() => {
    const map = new Map<string, EdgeView[]>();
    for (const e of relationships) {
      const key = [e.fromPersonId, e.toPersonId].sort().join("|");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [relationships]);

  return (
    <div className="relative size-full overflow-hidden">
      <svg
        ref={svgRef}
        className="size-full touch-none select-none"
        style={{ cursor: dragId ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        onWheel={onWheel}
        role="application"
        aria-label="Relationship graph"
      >
        <defs>
          <radialGradient id="cm-me-glow">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cm-edge-direct" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          <linearGradient id="cm-edge-directional" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <marker id="cm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#EC4899" />
          </marker>
          {people.map((p) =>
            p.avatarUrl ? (
              <clipPath key={p.id} id={`clip-${p.id}`}>
                <circle cx={0} cy={0} r={p.isMe ? ME_R : NODE_R} />
              </clipPath>
            ) : null,
          )}
        </defs>

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {[...edgeGroups.values()].map((group) =>
            group.map((edge, index) => {
              const a = resolved[edge.fromPersonId];
              const b = resolved[edge.toPersonId];
              if (!a || !b) return null;
              const dim = isDim(edge.fromPersonId) || isDim(edge.toPersonId);
              const active =
                hoverEdge === edge.id ||
                (!!selectedId && (edge.fromPersonId === selectedId || edge.toPersonId === selectedId));
              const offset = (index - (group.length - 1) / 2) * 44;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const nx = -(b.y - a.y);
              const ny = b.x - a.x;
              const len = Math.hypot(nx, ny) || 1;
              const cx = mx + (nx / len) * offset;
              const cy = my + (ny / len) * offset;
              const directional = edge.type === "directional";
              const path = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
              const labelX = mx + (nx / len) * offset * 0.85;
              const labelY = my + (ny / len) * offset * 0.85;

              return (
                <g key={edge.id} opacity={dim ? 0.08 : 1}>
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={18}
                    style={{ cursor: "pointer" }}
                    onPointerEnter={() => setHoverEdge(edge.id)}
                    onPointerLeave={() => setHoverEdge((cur) => (cur === edge.id ? null : cur))}
                    onClick={() => onEdgeSelect?.(edge)}
                  />
                  <path
                    d={path}
                    fill="none"
                    stroke={directional ? "url(#cm-edge-directional)" : "url(#cm-edge-direct)"}
                    strokeWidth={active ? 2.6 : 1.5}
                    strokeDasharray={directional ? undefined : active ? undefined : "7 7"}
                    markerEnd={directional ? "url(#cm-arrow)" : undefined}
                    opacity={active ? 1 : 0.65}
                    style={{ pointerEvents: "none" }}
                  />
                  {(showLabels || active) && (
                    <g style={{ pointerEvents: "none" }} opacity={active ? 1 : 0.85}>
                      <rect
                        x={labelX - (edge.label.length * 3.5 + 10)}
                        y={labelY - 11}
                        width={edge.label.length * 7 + 20}
                        height={22}
                        rx={11}
                        fill="#0F172A"
                        stroke={active ? "#EC4899" : "#334155"}
                        strokeWidth={1}
                      />
                      <text
                        x={labelX}
                        y={labelY + 4}
                        textAnchor="middle"
                        fontSize={11}
                        fill={active ? "#F8FAFC" : "#94A3B8"}
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            }),
          )}

          {people.map((person) => (
            <GraphNode
              key={person.id}
              person={person}
              point={resolved[person.id]}
              selected={selectedId === person.id}
              connectSource={connectSourceId === person.id}
              dim={isDim(person.id)}
              showLabel={showLabels}
            />
          ))}
        </g>
      </svg>

      <div className="pointer-events-none absolute bottom-4 right-3 flex flex-col gap-2 sm:bottom-6 sm:right-4">
        <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-line/60 bg-surface/80 p-1.5 backdrop-blur">
          <IconButton label="Zoom in" onClick={() => zoomBy(1.2)}>
            <Plus className="size-4" />
          </IconButton>
          <IconButton label="Zoom out" onClick={() => zoomBy(0.83)}>
            <Minus className="size-4" />
          </IconButton>
          <IconButton label="Fit graph to screen" onClick={fitView}>
            <Maximize2 className="size-4" />
          </IconButton>
          <IconButton
            label={focusMode ? "Turn off focus mode" : "Focus on selected person"}
            onClick={onToggleFocus}
            className={focusMode ? "border-primary/70 text-primary" : undefined}
          >
            <Crosshair className="size-4" />
          </IconButton>
          <IconButton
            label="Reset view"
            onClick={() => {
              setTransform({ x: 0, y: 0, k: 1 });
              fitView();
            }}
          >
            <RotateCcw className="size-4" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

const GraphNode = memo(function GraphNode({
  person,
  point,
  selected,
  dim,
  showLabel,
  connectSource,
}: {
  person: PersonView;
  point: Point;
  selected: boolean;
  dim: boolean;
  showLabel: boolean;
  connectSource: boolean;
}) {
  if (!point) return null;
  const r = person.isMe ? ME_R : NODE_R;
  const ring = person.isMe ? "#6366F1" : selected ? "#EC4899" : connectSource ? "#10B981" : "#8B5CF6";

  return (
    <g
      data-node-id={person.id}
      transform={`translate(${point.x},${point.y})`}
      opacity={dim ? 0.12 : 1}
      style={{ cursor: "pointer", transition: "opacity 180ms ease" }}
      tabIndex={0}
      role="button"
      aria-label={`${person.name}${person.relationshipToMe ? `, ${person.relationshipToMe}` : ""}`}
    >
      {person.isMe && <circle r={r + 34} fill="url(#cm-me-glow)" className="cm-pulse-ring" />}
      {selected && <circle r={r + 12} fill="none" stroke="#EC4899" strokeWidth={1.2} opacity={0.65} />}
      <circle r={r + 5} fill="#030712" />
      <circle r={r + 4} fill="none" stroke={ring} strokeWidth={selected ? 3.2 : 2.2} />
      {person.avatarUrl ? (
        <image
          href={person.avatarUrl}
          x={-r}
          y={-r}
          width={r * 2}
          height={r * 2}
          clipPath={`url(#clip-${person.id})`}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <>
          <circle r={r} fill="#1E293B" />
          <text textAnchor="middle" y={6} fontSize={r * 0.62} fill="#C7D2FE" fontWeight={600}>
            {person.name.slice(0, 1).toUpperCase()}
          </text>
        </>
      )}
      {showLabel && (
        <>
          <text textAnchor="middle" y={r + 24} fontSize={13} fontWeight={600} fill="#F8FAFC">
            {person.name.length > 18 ? `${person.name.slice(0, 17)}…` : person.name}
          </text>
          {person.relationshipToMe && (
            <text textAnchor="middle" y={r + 40} fontSize={11} fill="#94A3B8">
              {person.relationshipToMe}
            </text>
          )}
        </>
      )}
    </g>
  );
});
