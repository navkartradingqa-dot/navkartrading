export const site = {
  name: "Navkar Trading",
  nameAr: "نافكار للتجارة",
  domain: "navkartrading.qa",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://navkartrading.qa",
  description:
    "Laptops, mobile phones and accessories with local warranty. Delivery across Qatar, cash on delivery available.",
  descriptionAr:
    "لابتوبات وهواتف وملحقات بضمان محلي. توصيل لكل قطر مع خيار الدفع عند الاستلام.",
  phone: process.env.NEXT_PUBLIC_SHOP_PHONE ?? "+974 55116627",
  whatsapp: process.env.NEXT_PUBLIC_SHOP_WHATSAPP ?? "97455116627",
  email: process.env.NEXT_PUBLIC_SHOP_EMAIL ?? "sales@navkartrading.qa",
  address: "Doha, Qatar",
  addressAr: "الدوحة، قطر",
  currency: "QAR",

  /** Delivery rules — edit here, they apply to storefront and checkout. */
  delivery: {
    fee: "10.00",
    freeOver: "300.00",
    zonesServed: "All of Qatar",
  },

  hours: "Sat–Thu 9:00–21:00 · Fri 16:00–21:00",
} as const;

export function whatsappLink(message?: string) {
  const base = `https://wa.me/${site.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
