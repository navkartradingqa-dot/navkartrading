import type { Metadata } from "next";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  const rows = [
    { icon: Phone, label: "Phone", value: site.phone, href: `tel:${site.phone}` },
    { icon: Mail, label: "Email", value: site.email, href: `mailto:${site.email}` },
    { icon: MapPin, label: "Address", value: site.address },
    { icon: Clock, label: "Opening hours", value: site.hours },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink-950">Contact us</h1>
      <p className="mt-2 text-ink-500">
        The fastest way to reach us is WhatsApp — we usually reply within a few minutes during
        opening hours.
      </p>

      <a
        href={whatsappLink("Hello Navkar Trading,")}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700"
      >
        <MessageCircle size={18} />
        Chat on WhatsApp
      </a>

      <div className="card mt-8 divide-y divide-ink-100">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-3 p-4">
            <r.icon size={18} className="mt-0.5 shrink-0 text-brand-700" />
            <div>
              <p className="text-xs text-ink-400">{r.label}</p>
              {r.href ? (
                <a href={r.href} className="font-medium text-ink-900 hover:text-brand-700">
                  {r.value}
                </a>
              ) : (
                <p className="font-medium text-ink-900">{r.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
