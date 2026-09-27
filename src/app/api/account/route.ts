import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { jsonOk, readJson, route } from "@/lib/api";
import { destroySession, publicUser, requireUser } from "@/lib/auth";
import { deleteAccount, optionalText, text } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => {
    const user = await requireUser();
    return jsonOk({ user: publicUser(user) });
  });
}

export async function PATCH(request: Request) {
  return route(async () => {
    const user = await requireUser();
    const body = await readJson(request);
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if ("displayName" in body) patch.displayName = text(body.displayName, "Name", { max: 80, required: true });
    if ("bio" in body) patch.bio = optionalText(body.bio, "Bio", 280);
    if ("avatarUrl" in body) patch.avatarUrl = optionalText(body.avatarUrl, "Photo", 600);
    const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
    return jsonOk({ user: publicUser(updated) });
  });
}

export async function DELETE() {
  return route(async () => {
    const user = await requireUser();
    await deleteAccount(user);
    await destroySession();
    return jsonOk({ ok: true });
  });
}
