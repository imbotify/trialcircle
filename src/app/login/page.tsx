import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; demo?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/spaces");
  const params = await searchParams;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10 cm-aurora">
      <div className="absolute inset-0 cm-grid opacity-50" aria-hidden />
      <AuthForm
        initialMode={params.mode === "signup" ? "signup" : "login"}
        autoDemo={params.demo === "1"}
        demo={{ email: DEMO_EMAIL, password: DEMO_PASSWORD }}
      />
    </main>
  );
}
