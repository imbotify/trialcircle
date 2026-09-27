import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { requireMedia } from "@/lib/domain";

export const dynamic = "force-dynamic";

/**
 * Private media stream. Knowing an id is never enough — ownership is re-checked
 * against the authenticated account on every request.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return route(async () => {
    const user = await requireUser();
    const { id } = await ctx.params;
    const row = await requireMedia(user, id);
    const record = row.media;
    if (record.externalUrl && !record.data) {
      return Response.redirect(record.externalUrl, 307);
    }
    const buffer = Buffer.from(record.data ?? "", "base64");
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": record.mimeType,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${encodeURIComponent(record.fileName)}"`,
      },
    });
  });
}
