import { HttpError } from "@/lib/auth";

export function jsonOk(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/** Wraps a handler so domain errors become clean, non-leaky JSON responses. */
export async function route(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) return jsonError(err.message, err.status);
    const message = err instanceof Error ? err.message : "Unknown error";
    // Never echo raw SQL / stack details back to the client.
    console.error("[circlemap] request failed:", message);
    if (message.includes("duplicate key")) {
      return jsonError("That already exists.", 409);
    }
    return jsonError("Something went wrong on our side. Please try again.", 500);
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}
