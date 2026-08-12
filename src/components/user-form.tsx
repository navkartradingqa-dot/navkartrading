"use client";

import { useActionState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { saveUser, type ActionState } from "@/app/admin/actions";

export function UserForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveUser, {});

  return (
    <form action={action} className="card h-fit p-5">
      <h2 className="mb-4 font-bold text-ink-950">Add a staff account</h2>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Full name</span>
          <input name="name" className="field" required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Email</span>
          <input name="email" type="email" className="field" required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Role</span>
          <select name="role" className="field" defaultValue="CASHIER">
            <option value="CASHIER">Cashier — POS only</option>
            <option value="MANAGER">Manager — products, stock, orders</option>
            <option value="ADMIN">Admin — everything</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">
            Password (8 characters minimum)
          </span>
          <input name="password" type="password" className="field" required minLength={8} />
        </label>
      </div>

      {state.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-4 w-full disabled:opacity-60">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
        Create account
      </button>
    </form>
  );
}
