import { Suspense } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { getCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategories();
  const light = categories.map((c) => ({ slug: c.slug, nameEn: c.nameEn, nameAr: c.nameAr }));

  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<div className="h-28 border-b border-ink-100 bg-white" />}>
        <Header categories={light} />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer categories={light} />
    </div>
  );
}
