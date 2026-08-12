import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const user = await readSession();
  if (user) redirect(user.role === "CASHIER" ? "/pos" : "/admin");

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-br from-brand-900 to-brand-700 p-4">
      <Suspense fallback={null}>
        <LoginForm variant="admin" />
      </Suspense>
    </div>
  );
}
