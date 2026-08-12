import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import { getCategories, listProducts } from "@/lib/catalog";
import { getOpenShift, shiftTotals } from "./actions";
import { PosTerminal } from "@/components/pos-terminal";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const user = await readSession();
  if (!user) redirect("/pos/login");

  const [categories, initial, shift] = await Promise.all([
    getCategories(),
    listProducts({ perPage: 40, sort: "relevance", inStock: true }),
    getOpenShift(user.id),
  ]);

  const totals = shift ? await shiftTotals(shift.id) : null;

  return (
    <PosTerminal
      user={{ id: user.id, name: user.name, role: user.role }}
      categories={categories.map((c) => ({ slug: c.slug, name: c.nameEn }))}
      initialProducts={initial.items.map((p) => ({
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        nameEn: p.nameEn,
        price: p.price,
        stock: p.stock,
        brandName: p.brandName,
      }))}
      shift={
        shift
          ? {
              id: shift.id,
              openedAt: shift.openedAt.toISOString(),
              openingFloat: shift.openingFloat,
              totals: totals!,
            }
          : null
      }
    />
  );
}
