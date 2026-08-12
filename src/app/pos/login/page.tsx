import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function PosLoginPage() {
  const user = await readSession();
  if (user) redirect("/pos");

  return (
    <div className="grid min-h-dvh place-items-center bg-ink-900 p-4">
      <Suspense fallback={null}>
        <LoginForm variant="pos" />
      </Suspense>
    </div>
  );
}
