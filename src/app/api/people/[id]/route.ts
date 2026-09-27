import { jsonOk, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { deletePerson, getPersonDetail, updatePerson } from "@/lib/domain";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    return jsonOk(await getPersonDetail(user, id));
  });
}

export async function PATCH(request: Request, ctx: Ctx) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const body = await readJson(request);
    await updatePerson(user, id, body);
    return jsonOk(await getPersonDetail(user, id));
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    await deletePerson(user, id);
    return jsonOk({ ok: true });
  });
}
