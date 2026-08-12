import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { site } from "@/lib/site";

const POLICIES: Record<string, { title: string; body: string[] }> = {
  shipping: {
    title: "Delivery & shipping",
    body: [
      `We deliver across Qatar. Orders placed before 4:00 pm on a working day are normally delivered the same day inside Doha, and the next working day elsewhere in the country.`,
      `Delivery is QAR ${site.delivery.fee} per order, and free on orders over QAR ${site.delivery.freeOver}.`,
      `Our driver will call the mobile number on the order before arriving. If nobody answers we will attempt delivery once more the following day.`,
      `Large items (monitors, printers, appliances) may be scheduled for a specific time slot — we will agree this with you on WhatsApp.`,
      `Please replace this text with your own delivery terms and courier arrangements before launch.`,
    ],
  },
  returns: {
    title: "Returns & warranty",
    body: [
      `Unopened items in their original sealed packaging can be exchanged or returned within 7 days of delivery, with the invoice.`,
      `Opened items can be exchanged within 7 days only if faulty. Software issues, accidental damage, liquid damage and normal wear are not covered.`,
      `Manufacturer warranty periods are shown on each product page and start from the date of purchase. Warranty service is handled at our Doha counter — bring the device and the invoice.`,
      `Consumables and personal-use items (earphone tips, screen protectors already applied, opened memory cards) cannot be returned once opened.`,
      `Refunds on card payments are returned to the original card and can take 5–10 working days to appear, depending on your bank.`,
      `Please replace this text with your own returns policy before launch.`,
    ],
  },
  privacy: {
    title: "Privacy policy",
    body: [
      `We collect only what we need to fulfil your order: your name, mobile number, delivery address, and optionally your email address.`,
      `Card details are never stored on our servers. Online card payments are processed by our payment gateway, which is responsible for handling and securing card data.`,
      `We use your mobile number to contact you about your order — for example to confirm the address or to tell you the driver is on the way.`,
      `We do not sell or rent your personal information to third parties. We share your address only with the courier delivering your order.`,
      `To ask for a copy of your data, or to have it deleted, email ${site.email}.`,
      `Please have this policy reviewed against Qatar's Personal Data Privacy Protection Law (Law No. 13 of 2016) before launch.`,
    ],
  },
  terms: {
    title: "Terms of sale",
    body: [
      `All prices are shown in Qatari Riyal (QAR) and include any applicable charges. Prices may change without notice; the price shown at the time you place your order is the price you pay.`,
      `Placing an order is an offer to buy. The sale is confirmed once we confirm stock and contact you. If an item turns out to be unavailable we will contact you to arrange a replacement or a refund.`,
      `Products are supplied for personal or business use in Qatar. Region-specific products (chargers, warranty coverage) are supplied to Qatari specification.`,
      `Cash on delivery orders must be paid in full to the driver, in cash or by card on the driver's terminal, before the goods are handed over.`,
      `These terms are governed by the laws of the State of Qatar. Please have them reviewed by a local advisor before launch.`,
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: POLICIES[slug]?.title ?? "Policy" };
}

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }));
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = POLICIES[slug];
  if (!policy) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink-950">{policy.title}</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-ink-600">
        {policy.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <p className="mt-8 text-xs text-ink-400">
        Last updated {new Date().toLocaleDateString("en-GB", { dateStyle: "long" })}
      </p>
    </div>
  );
}
