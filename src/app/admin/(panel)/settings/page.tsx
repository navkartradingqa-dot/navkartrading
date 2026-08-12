import { desc } from "drizzle-orm";
import { KeyRound, CreditCard, Globe, Truck } from "lucide-react";
import { db } from "@/db";
import { apiKeys, categories, brands } from "@/db/schema";
import { ApiKeyIssuer } from "@/components/api-key-issuer";
import { TaxonomyForms } from "@/components/taxonomy-forms";
import { revokeApiKey } from "@/app/admin/actions";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [keys, cats, brandRows] = await Promise.all([
    db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt)),
    db.select().from(categories).orderBy(categories.sortOrder),
    db.select().from(brands).orderBy(brands.name),
  ]);

  const provider = process.env.PAYMENT_PROVIDER || "mock";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-950">Settings</h1>
        <p className="text-sm text-ink-500">
          Shop configuration, payment gateway status and POS terminal keys.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Globe size={18} className="text-brand-700" />
            <h2 className="font-bold text-ink-950">Shop details</h2>
          </div>
          <dl className="space-y-2 text-sm">
            {[
              ["Trading name", site.name],
              ["Domain", site.domain],
              ["Phone", site.phone],
              ["WhatsApp", site.whatsapp],
              ["Email", site.email],
              ["Address", site.address],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-ink-400">{k}</dt>
                <dd className="text-end font-medium text-ink-800">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-ink-400">
            These come from environment variables and <code>src/lib/site.ts</code>. Update them in
            Vercel → Settings → Environment Variables, then redeploy.
          </p>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Truck size={18} className="text-brand-700" />
            <h2 className="font-bold text-ink-950">Delivery</h2>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-400">Standard fee</dt>
              <dd className="font-medium">QAR {site.delivery.fee}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-400">Free over</dt>
              <dd className="font-medium">QAR {site.delivery.freeOver}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-400">Zones served</dt>
              <dd className="font-medium">{site.delivery.zonesServed}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-400">
            Edit <code>src/lib/site.ts</code> to change these. Counter sales never carry a delivery
            fee.
          </p>
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard size={18} className="text-brand-700" />
            <h2 className="font-bold text-ink-950">Payment gateway</h2>
          </div>
          <p className="text-sm">
            Active provider:{" "}
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                provider === "mock" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {provider}
            </span>
          </p>
          {provider === "mock" ? (
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              You are in <strong>test mode</strong>. Card checkouts go to a simulated bank page and
              no money moves. Cash on delivery works normally. To go live: open a Skipcash merchant
              account, put the keys in your environment variables and set{" "}
              <code>PAYMENT_PROVIDER=skipcash</code>.
            </p>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              Live gateway. Confirm the webhook URL in your merchant dashboard points to{" "}
              <code>{site.url}/api/payments/{provider}/webhook</code>.
            </p>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound size={18} className="text-brand-700" />
            <h2 className="font-bold text-ink-950">POS terminal API keys</h2>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-ink-500">
            Issue a key for an external POS machine or a second till. The device sends it as{" "}
            <code>Authorization: Bearer &lt;key&gt;</code> to <code>/api/pos/v1/*</code>.
          </p>

          <ApiKeyIssuer />

          {keys.length > 0 && (
            <ul className="mt-4 divide-y divide-ink-100 text-sm">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium text-ink-800">{k.label}</p>
                    <p className="font-mono text-[11px] text-ink-400">{k.prefix}…</p>
                  </div>
                  {k.active ? (
                    <form action={revokeApiKey}>
                      <input type="hidden" name="id" value={k.id} />
                      <button className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                        Revoke
                      </button>
                    </form>
                  ) : (
                    <span className="text-xs text-ink-400">Revoked</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <TaxonomyForms
        categories={cats.map((c) => ({ id: c.id, label: c.nameEn }))}
        brands={brandRows.map((b) => ({ id: b.id, label: b.name }))}
      />
    </div>
  );
}
