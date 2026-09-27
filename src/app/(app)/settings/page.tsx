import { redirect } from "next/navigation";
import SettingsClient from "@/components/SettingsClient";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { listSpaces } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const spaces = await listSpaces(user);
  return <SettingsClient user={publicUser(user)} spaces={spaces} />;
}
