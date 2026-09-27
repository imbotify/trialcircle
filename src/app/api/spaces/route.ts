import { jsonOk, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createSpace, listSpaces } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => {
    const user = await requireUser();
    return jsonOk({ spaces: await listSpaces(user) });
  });
}

export async function POST(request: Request) {
  return route(async () => {
    const user = await requireUser();
    const body = await readJson(request);
    const space = await createSpace(user, body);
    return jsonOk({ space: { id: space.id, name: space.name } }, { status: 201 });
  });
}
