import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await readSession();
  if (!user) redirect("/admin/login");
  if (user.role === "CASHIER") redirect("/pos");

  return <AdminShell user={user}>{children}</AdminShell>;
}
