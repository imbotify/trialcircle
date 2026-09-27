import { jsonOk, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { allConnections, searchPeople } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return route(async () => {
    const user = await requireUser();
    const q = new URL(request.url).searchParams.get("q") ?? "";
    if (q.trim()) return jsonOk({ people: await searchPeople(user, q) });
    return jsonOk({ people: await allConnections(user) });
  });
}
