import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { UserForm } from "@/components/user-form";
import { toggleUserActive } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const ROLE_NOTE: Record<string, string> = {
  ADMIN: "Everything, including staff accounts and API keys",
  MANAGER: "Products, stock, orders and the POS",
  CASHIER: "POS only — cannot see the admin panel",
};

export default async function UsersPage() {
  const rows = await db.select().from(users).orderBy(asc(users.name));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink-950">Staff accounts</h1>
        <p className="text-sm text-ink-500">Who can sign in to the back office and the counter.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/70 text-xs text-ink-400">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">Name</th>
                <th className="px-4 py-2.5 text-start font-medium">Role</th>
                <th className="px-4 py-2.5 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-900">{u.name}</p>
                    <p className="text-[11px] text-ink-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink-700">{u.role}</p>
                    <p className="text-[11px] text-ink-400">{ROLE_NOTE[u.role]}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <form action={toggleUserActive}>
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        type="submit"
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          u.active ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-500"
                        }`}
                      >
                        {u.active ? "Active" : "Disabled"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <UserForm />
      </div>

      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        The three seeded accounts share one password from <code>SEED_ADMIN_PASSWORD</code>. Change
        each one before the shop goes live.
      </p>
    </div>
  );
}
