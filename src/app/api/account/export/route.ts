import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { exportData } from "@/lib/domain";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => {
    const user = await requireUser();
    const data = await exportData(user);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="circlemap-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  });
}
