import { jsonError, jsonOk, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import {
  createField,
  createMedia,
  createMemory,
  getPersonDetail,
  reorderFields,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; resource: string }> };

/** POST /api/people/:id/fields | memories | media */
export async function POST(request: Request, ctx: Ctx) {
  return route(async () => {
    const user = await requireUser();
    const { id, resource } = await ctx.params;
    const body = await readJson(request);

    if (resource === "fields") await createField(user, id, body);
    else if (resource === "memories") await createMemory(user, id, body);
    else if (resource === "media") await createMedia(user, id, body);
    else return jsonError("Unknown resource.", 404);

    return jsonOk(await getPersonDetail(user, id), { status: 201 });
  });
}

/** PATCH /api/people/:id/fields — reorder */
export async function PATCH(request: Request, ctx: Ctx) {
  return route(async () => {
    const user = await requireUser();
    const { id, resource } = await ctx.params;
    if (resource !== "fields") return jsonError("Unknown resource.", 404);
    const body = await readJson(request);
    await reorderFields(user, id, body.order);
    return jsonOk(await getPersonDetail(user, id));
  });
}
