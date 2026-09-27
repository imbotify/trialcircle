import { jsonOk, readJson, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createRelationship } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return route(async () => {
    const user = await requireUser();
    const body = await readJson(request);
    const relationship = await createRelationship(user, body);
    return jsonOk(
      {
        relationship: {
          id: relationship.id,
          spaceId: relationship.spaceId,
          fromPersonId: relationship.fromPersonId,
          toPersonId: relationship.toPersonId,
          label: relationship.label,
          type: relationship.type,
        },
      },
      { status: 201 },
    );
  });
}
