import type { MetadataRoute } from "next";
import { getCategories, listProducts } from "@/lib/catalog";
import { site } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");

  const staticPages = [
    "",
    "/shop",
    "/track",
    "/about",
    "/contact",
    "/policies/shipping",
    "/policies/returns",
    "/policies/privacy",
    "/policies/terms",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  try {
    const [categories, products] = await Promise.all([
      getCategories(),
      listProducts({ perPage: 1000, sort: "newest" }),
    ]);

    return [
      ...staticPages,
      ...categories.map((c) => ({
        url: `${base}/category/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...products.items.map((p) => ({
        url: `${base}/product/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    // Database not reachable at build time — still emit the static pages.
    return staticPages;
  }
}
