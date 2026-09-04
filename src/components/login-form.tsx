"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { loginAction, type LoginState } from "@/app/auth-actions";

export function LoginForm({ variant = "admin" }: { variant?: "admin" | "pos" }) {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={action} className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-lg">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-700 text-sm font-black text-white">
          <p>Navkar Trading</p>
        </span>
        <div>
        <img src="/Navkar-Logo.jpg" alt="Navkar Trading" className="h-[50px] w-auto object-contain" />
          <p className="text-xs text-ink-400">
            {variant === "pos" ? "Counter POS sign in" : "Admin & inventory sign in"}
          </p>
        </div>
      </div>

      <input type="hidden" name="next" value={params.get("next") ?? ""} />

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-ink-500">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field"
          placeholder="admin@navkartrading.qa"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-ink-500">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </label>

      {state.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-5 w-full disabled:opacity-60">
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
        Sign in
      </button>

      
    </form>
  );
}
