import { notFound, redirect } from "next/navigation";
import SpaceWorkspace from "@/components/space/SpaceWorkspace";
import { HttpError, getCurrentUser } from "@/lib/auth";
import { getSpaceGraph } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;

  try {
    const graph = await getSpaceGraph(user, id);
    return <SpaceWorkspace initialGraph={graph} />;
  } catch (err) {
    if (err instanceof HttpError && err.status === 404) notFound();
    throw err;
  }
}
