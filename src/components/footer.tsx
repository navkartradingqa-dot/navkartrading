"use client";

import Link from "next/link";
import { MapPin, Phone, Mail, Clock, MessageCircle } from "lucide-react";
import { useLocale } from "@/i18n/client";
import { site, whatsappLink } from "@/lib/site";

type Cat = { slug: string; nameEn: string; nameAr: string };

export function Footer({ categories }: { categories: Cat[] }) {
  const { t, locale } = useLocale();

  return (
    <footer className="mt-16 border-t border-ink-100 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-700 text-sm font-black text-white">
              NT
            </span>
            <span className="font-bold text-ink-950">{t("brand.name")}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            {locale === "ar" ? site.descriptionAr : site.description}
          </p>
          <div className="mt-4 space-y-2 text-sm text-ink-600">
            <p className="flex items-center gap-2">
              <MapPin size={15} className="shrink-0 text-brand-700" />
              {locale === "ar" ? site.addressAr : site.address}
            </p>
            <a href={`tel:${site.phone}`} className="flex items-center gap-2 hover:text-brand-700">
              <Phone size={15} className="shrink-0 text-brand-700" />
              {site.phone}
            </a>
            <a
              href={`mailto:${site.email}`}
              className="flex items-center gap-2 hover:text-brand-700"
            >
              <Mail size={15} className="shrink-0 text-brand-700" />
              {site.email}
            </a>
            <p className="flex items-center gap-2">
              <Clock size={15} className="shrink-0 text-brand-700" />
              {site.hours}
            </p>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold text-ink-950">{t("footer.shop")}</h3>
          <ul className="space-y-2 text-sm text-ink-600">
            {categories.slice(0, 8).map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className="hover:text-brand-700">
                  {locale === "ar" ? c.nameAr : c.nameEn}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold text-ink-950">{t("footer.help")}</h3>
          <ul className="space-y-2 text-sm text-ink-600">
            <li>
              <Link href="/track" className="hover:text-brand-700">
                {t("nav.track")}
              </Link>
            </li>
            <li>
              <Link href="/policies/shipping" className="hover:text-brand-700">
                Delivery & shipping
              </Link>
            </li>
            <li>
              <Link href="/policies/returns" className="hover:text-brand-700">
                Returns & warranty
              </Link>
            </li>
            <li>
              <Link href="/policies/privacy" className="hover:text-brand-700">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/policies/terms" className="hover:text-brand-700">
                Terms of sale
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold text-ink-950">{t("footer.company")}</h3>
          <ul className="space-y-2 text-sm text-ink-600">
            <li>
              <Link href="/about" className="hover:text-brand-700">
                {t("nav.about")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-brand-700">
                {t("nav.contact")}
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-brand-700">
                {t("nav.account")}
              </Link>
            </li>
          </ul>

          <a
            href={whatsappLink("Hello Navkar Trading, I have a question about")}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <MessageCircle size={16} />
            WhatsApp us
          </a>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold text-ink-400">{t("footer.payments")}</p>
            <div className="flex flex-wrap gap-1.5">
              {["Visa", "Mastercard", "Himyan", "Apple Pay", "Google Pay", "COD"].map((p) => (
                <span
                  key={p}
                  className="rounded border border-ink-200 bg-white px-2 py-1 text-[10px] font-medium text-ink-600"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-ink-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}
          </p>
          <p>{site.domain}</p>
        </div>
      </div>
    </footer>
  );
}
