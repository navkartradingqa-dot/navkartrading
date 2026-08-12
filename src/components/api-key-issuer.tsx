"use client";

import { useActionState } from "react";
import { Loader2, KeyRound, Copy } from "lucide-react";
import { issueApiKey, type ActionState } from "@/app/admin/actions";

export function ApiKeyIssuer() {
  const [state, action, pending] = useActionState<ActionState, FormData>(issueApiKey, {});

  return (
    <>
      <form action={action} className="flex gap-2">
        <input
          name="label"
          placeholder="Counter 2 terminal"
          className="field flex-1"
          required
        />
        <button type="submit" disabled={pending} className="btn-primary text-sm disabled:opacity-60">
          {pending ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
          Issue
        </button>
      </form>

      {state.error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
      )}

      {state.secret && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-800">{state.message}</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded bg-white px-2 py-1.5 font-mono text-[11px] text-ink-800">
              {state.secret}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(state.secret!)}
              className="rounded border border-emerald-300 p-1.5 text-emerald-700"
              aria-label="Copy"
            >
              <Copy size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
