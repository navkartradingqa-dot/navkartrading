import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "About us" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink-950">About {site.name}</h1>
      <div className="mt-6 space-y-4 text-ink-600 leading-relaxed">
        <p>
          {site.name} is an electronics retailer based in Doha, Qatar. We sell laptops, mobile
          phones, tablets and accessories over the counter and online, with delivery across the
          country.
        </p>
        <p>
          Every item we stock is sourced through authorised channels and carries a warranty that can
          be serviced locally — you bring the device back to our counter rather than shipping it
          abroad.
        </p>
        <p>
          Whether you order online or walk in, you are buying from the same stock. Our website and
          our counter share one live inventory, so what the site says is in stock is what is on the
          shelf.
        </p>

        <h2 className="pt-4 text-xl font-bold text-ink-950">Visit us</h2>
        <p>
          {site.address}
          <br />
          {site.hours}
          <br />
          {site.phone} · {site.email}
        </p>

        <p className="rounded-xl bg-ink-50 p-4 text-sm">
          <strong>Note for the shop owner:</strong> replace this text with your real trade licence
          details, CR number and shop address before launch. Qatari e-commerce sites are expected to
          display the trading name and contact details of the licensed business.
        </p>
      </div>
    </div>
  );
}
