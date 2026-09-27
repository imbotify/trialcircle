import { jsonOk, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import {
  createPerson,
  deleteSpace,
  getSpaceGraph,
  saveLayout,
  updateSpace,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Full graph payload for a Space (people + relationships + persisted layout). */
export async function GET(_request: Request, ctx: Ctx) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return jsonOk(await getSpaceGraph(user, id));
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson(request);
    const space = await updateSpace(user, id, body);
    return jsonOk({ space });
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    await deleteSpace(user, id);
    return jsonOk({ ok: true });
  });
}

/** Add a person to this Space (optionally with an initial relationship to Me). */
export async function POST(request: Request, ctx: Ctx) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson(request);
    const person = await createPerson(user, id, body as Parameters<typeof createPerson>[2]);
    const graph = await getSpaceGraph(user, id);
    return jsonOk({ personId: person.id, ...graph }, { status: 201 });
  });
}

/** Debounced layout persistence for the current view mode. */
export async function PUT(request: Request, ctx: Ctx) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson(request);
    const positions = Array.isArray(body.positions)
      ? (body.positions as Array<{ personId: string; x: number; y: number }>)
      : [];
    await saveLayout(user, id, String(body.viewMode ?? "circle"), positions);
    return jsonOk({ ok: true });
  });
}
