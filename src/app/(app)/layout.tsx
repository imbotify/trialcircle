import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getCurrentUser, publicUser } from "@/lib/auth";
import { listSpaces } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const spaces = await listSpaces(user);

  return (
    <AppShell user={publicUser(user)} spaces={spaces}>
      {children}
    </AppShell>
  );
}
