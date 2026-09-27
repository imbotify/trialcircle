import { redirect } from "next/navigation";
import SpacesClient from "@/components/spaces/SpacesClient";
import { getCurrentUser } from "@/lib/auth";
import { listSpaces } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function SpacesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const spaces = await listSpaces(user);
  return <SpacesClient initialSpaces={spaces} displayName={user.displayName} />;
}
