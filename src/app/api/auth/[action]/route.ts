import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { jsonError, jsonOk, readJson, route } from "@/lib/api";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  publicUser,
  verifyPassword,
} from "@/lib/auth";
import { DEMO_EMAIL, DEMO_PASSWORD, ensureDemoAccount, seedStarterSpace } from "@/lib/seed";

export const dynamic = "force-dynamic";

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function POST(request: Request, ctx: { params: Promise<{ action: string }> }) {
  return route(async () => {
    const { action } = await ctx.params;
    const body = await readJson(request);

    if (action === "logout") {
      await destroySession();
      return jsonOk({ ok: true });
    }

    if (action === "demo") {
      const demo = await ensureDemoAccount();
      await createSession(demo.id);
      return jsonOk({ user: publicUser(demo) });
    }

    if (action === "signup") {
      const email = normalizeEmail(body.email);
      const password = String(body.password ?? "");
      const displayName = String(body.displayName ?? "").trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonError("Enter a valid email address.", 422);
      if (password.length < 8) return jsonError("Password must be at least 8 characters.", 422);
      if (displayName.length < 2) return jsonError("Tell us your name (2+ characters).", 422);

      const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
      if (existing.length) return jsonError("An account with that email already exists.", 409);

      const passwordHash = await hashPassword(password);
      const [user] = await db
        .insert(users)
        .values({ email, passwordHash, displayName })
        .returning();
      await seedStarterSpace(user.id);
      await createSession(user.id);
      return jsonOk({ user: publicUser(user) }, { status: 201 });
    }

    if (action === "login") {
      const email = normalizeEmail(body.email);
      const password = String(body.password ?? "");
      if (email === DEMO_EMAIL) await ensureDemoAccount();
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!user) return jsonError("Email or password is incorrect.", 401);
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return jsonError("Email or password is incorrect.", 401);
      await createSession(user.id);
      return jsonOk({ user: publicUser(user) });
    }

    return jsonError("Unknown action.", 404);
  });
}

export async function GET(_request: Request, ctx: { params: Promise<{ action: string }> }) {
  return route(async () => {
    const { action } = await ctx.params;
    if (action !== "user") return jsonError("Unknown action.", 404);
    const user = await getCurrentUser();
    return jsonOk({ user: user ? publicUser(user) : null, demoCredentials: { email: DEMO_EMAIL, password: DEMO_PASSWORD } });
  });
}
