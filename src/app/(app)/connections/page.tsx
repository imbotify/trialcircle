import { redirect } from "next/navigation";
import ConnectionsClient from "@/components/ConnectionsClient";
import { getCurrentUser } from "@/lib/auth";
import { allConnections, listSpaces } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [people, spaces] = await Promise.all([allConnections(user), listSpaces(user)]);
  return <ConnectionsClient people={people} spaces={spaces} />;
}
