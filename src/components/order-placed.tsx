"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Check, MessageCircle } from "lucide-react";

type Props = {
  orderNumber: string;
  trackingToken: string;
  /** Translated strings from the server component. */
  title: string;
  sub: string;
  saveNote: string;
  /** Optional overrides — English defaults until the Arabic keys are added. */
  codeLabel?: string;
  copyLabel?: string;
  copiedLabel?: string;
  whatsappLabel?: string;
  lookupNote?: string;
};

export function OrderPlaced({
  orderNumber,
  trackingToken,
  title,
  sub,
  saveNote,
  codeLabel = "Your tracking code",
  copyLabel = "Copy code",
  copiedLabel = "Copied",
  whatsappLabel = "Save to WhatsApp",
  lookupNote = "Lost the code? You can also find this order using the mobile number you ordered with.",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const text = trackingToken;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement("textarea");
        el.value = text;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked — the code is on screen, so the user can still write it down.
    }
  }

  const waText = encodeURIComponent(
    `Navkar Trading order ${orderNumber}\nTracking code: ${trackingToken}\nTrack it here: https://navkartrading.qa/order/${trackingToken}`,
  );

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50">
      <div className="flex items-start gap-3 p-4 pb-0">
        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={22} />
        <div>
          <p className="font-bold text-emerald-900">{title}</p>
          <p className="mt-0.5 text-sm text-emerald-700">{sub}</p>
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-lg border border-emerald-200 bg-white p-4">
          <p className="text-sm text-ink-500">{codeLabel}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="font-mono text-3xl font-bold tracking-wider text-brand-700 sm:text-4xl">
              {trackingToken}
            </p>

            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 hover:border-brand-400 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              {copied ? (
                <Check size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
              {copied ? copiedLabel : copyLabel}
            </button>
          </div>

          <p aria-live="polite" className="sr-only">
            {copied ? copiedLabel : ""}
          </p>

          <p className="mt-3 text-sm text-ink-600">{saveNote}</p>

          <a
            href={`https://wa.me/?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <MessageCircle size={16} />
            {whatsappLabel}
          </a>
        </div>

        <p className="mt-3 text-xs text-emerald-700">{lookupNote}</p>
      </div>
    </div>
  );
}
