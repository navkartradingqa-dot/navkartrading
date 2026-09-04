import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLocale } from "@/i18n/server";
import { LocaleProvider } from "@/i18n/client";
import { CartProvider } from "@/components/cart-context";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Electronics & Mobiles in Doha, Qatar`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_QA",
    alternateLocale: "ar_QA",
  },
  icons: { icon: "/Navkar-Logo.jpg" },
};

export const viewport: Viewport = {
  themeColor: "#8f1f43",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <LocaleProvider locale={locale}>
          <CartProvider>{children}</CartProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
