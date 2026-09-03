"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { put } from "@vercel/blob";
import {
  products,
  stockMovements,
  users,
  apiKeys,
  categories,
  brands,
  type MovementType,
  type OrderStatus,
  type Role,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { createId, createApiKey } from "@/lib/id";
import { setOrderStatus, cancelOrder } from "@/lib/orders";

export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  secret?: string;
};

function slugify(v: string) {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

/* --------------------------------------------------------------- products */

export async function saveProduct(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("MANAGER");
  if (!user) return { error: "You do not have permission to edit products." };

  const id = String(formData.get("id") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const nameAr = String(formData.get("nameAr") ?? "").trim();
  const sku = String(formData.get("sku") ?? "")
    .trim()
    .toUpperCase();
  const categoryId = String(formData.get("categoryId") ?? "");
  const price = String(formData.get("price") ?? "0");

  if (!nameEn || !sku || !categoryId) {
    return { error: "Name, SKU and category are required." };
  }
  if (Number.isNaN(Number(price)) || Number(price) < 0) {
    return { error: "Enter a valid price." };
  }

  const rawSpecs = String(formData.get("specs") ?? "").trim();
  let specs: Record<string, string> = {};
  if (rawSpecs) {
    try {
      specs = JSON.parse(rawSpecs) as Record<string, string>;
    } catch {
      // Fall back to "Key: value" lines, which is easier to type.
      specs = Object.fromEntries(
        rawSpecs
          .split("\n")
          .map((line) => line.split(/:(.+)/).map((s) => s.trim()))
          .filter((parts) => parts.length >= 2 && parts[0])
          .map((parts) => [parts[0], parts[1]]),
      );
    }
  }

  // --- Image upload handling ---
  const imageFiles = formData
    .getAll("images")
    .filter((f): f is File => f instanceof File && f.size > 0);

  let images: string[] = [];
  try {
    const uploaded = await Promise.all(
      imageFiles.map((file) =>
        put(`products/${sku || "misc"}-${Date.now()}-${file.name}`, file, {
          access: "public",
          addRandomSuffix: true,
        }),
      ),
    );
    images = uploaded.map((blob) => blob.url);
  } catch {
    return {
      error: "Image upload failed. Please try again with smaller images.",
    };
  }

  // If editing an existing product and no new images were uploaded, keep the old ones.
  if (id && images.length === 0) {
    const [existing] = await db
      .select({ images: products.images })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);
    images = existing?.images ?? [];
  }
  // --- end image upload handling ---

  const compareAt = String(formData.get("compareAtPrice") ?? "").trim();
  const brandId = String(formData.get("brandId") ?? "").trim();

  const values = {
    sku,
    barcode: String(formData.get("barcode") ?? "").trim() || null,
    nameEn,
    nameAr: nameAr || nameEn,
    descEn: String(formData.get("descEn") ?? ""),
    descAr: String(formData.get("descAr") ?? ""),
    categoryId,
    brandId: brandId || null,
    price: Number(price).toFixed(2),
    compareAtPrice: compareAt ? Number(compareAt).toFixed(2) : null,
    cost: Number(String(formData.get("cost") ?? "0") || 0).toFixed(2),
    lowStockThreshold: Number(formData.get("lowStockThreshold") ?? 5) || 0,
    warrantyMonths: Number(formData.get("warrantyMonths") ?? 12) || 0,
    images,
    specs,
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
    updatedAt: new Date(),
  };

  try {
    if (id) {
      await db.update(products).set(values).where(eq(products.id, id));
    } else {
      const newId = createId();
      const stock = Number(formData.get("stock") ?? 0) || 0;
      await db.insert(products).values({
        ...values,
        id: newId,
        slug: `${slugify(nameEn)}-${sku.toLowerCase()}`,
        stock,
      });
      if (stock > 0) {
        await db.insert(stockMovements).values({
          id: createId(),
          productId: newId,
          delta: stock,
          balance: stock,
          type: "INITIAL",
          reference: "NEW PRODUCT",
          userId: user.id,
        });
      }
      revalidatePath("/admin/products");
      redirect(`/admin/products/${newId}`);
    }
  } catch (err) {
    const message = (err as Error).message;
    if (message.includes("duplicate key")) {
      return {
        error: "That SKU or barcode is already used by another product.",
      };
    }
    throw err;
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  return { ok: true, message: "Saved." };
}

export async function toggleProductActive(formData: FormData) {
  const user = await requireRole("MANAGER");
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  await db
    .update(products)
    .set({ active: sql`not ${products.active}`, updatedAt: new Date() })
    .where(eq(products.id, id));
  revalidatePath("/admin/products");
}

/* -------------------------------------------------------------- inventory */

export async function adjustStock(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("MANAGER");
  if (!user) return { error: "You do not have permission to change stock." };

  const productId = String(formData.get("productId") ?? "");
  const mode = String(formData.get("mode") ?? "delta"); // "delta" | "set"
  const amount = Number(formData.get("amount") ?? 0);
  const type =
    (String(formData.get("type") ?? "ADJUSTMENT") as MovementType) ||
    "ADJUSTMENT";
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!productId || Number.isNaN(amount))
    return { error: "Enter a valid quantity." };

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product) return { error: "Product not found." };

  const delta = mode === "set" ? amount - product.stock : amount;
  const balance = product.stock + delta;
  if (balance < 0) return { error: "That would take stock below zero." };
  if (delta === 0) return { ok: true, message: "No change." };

  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({ stock: balance, updatedAt: new Date() })
      .where(eq(products.id, productId));
    await tx.insert(stockMovements).values({
      id: createId(),
      productId,
      delta,
      balance,
      type,
      reference: mode === "set" ? "STOCK COUNT" : null,
      note,
      userId: user.id,
    });
  });

  revalidatePath("/admin/inventory");
  revalidatePath("/admin/movements");
  revalidatePath(`/admin/products/${productId}`);
  return { ok: true, message: `Stock updated to ${balance}.` };
}

/* ----------------------------------------------------------------- orders */

export async function updateOrderStatusAction(formData: FormData) {
  const user = await requireRole("MANAGER");
  if (!user) return;
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  const note = String(formData.get("note") ?? "").trim() || undefined;
  if (!orderId || !status) return;

  if (status === "CANCELLED") {
    await cancelOrder(orderId, note ?? `Cancelled by ${user.name}`);
  } else {
    await setOrderStatus(orderId, status, note);
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

/* ------------------------------------------------------------------ staff */

export async function saveUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  if (!admin) return { error: "Only an admin can manage staff accounts." };

  const id = String(formData.get("id") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "CASHIER") as Role;
  const password = String(formData.get("password") ?? "");

  if (!email || !name) return { error: "Name and email are required." };

  try {
    if (id) {
      const patch: Record<string, unknown> = { email, name, role };
      if (password) {
        if (password.length < 8)
          return { error: "Password must be at least 8 characters." };
        patch.passwordHash = await bcrypt.hash(password, 10);
      }
      await db.update(users).set(patch).where(eq(users.id, id));
    } else {
      if (password.length < 8)
        return { error: "Password must be at least 8 characters." };
      await db.insert(users).values({
        id: createId(),
        email,
        name,
        role,
        passwordHash: await bcrypt.hash(password, 10),
        active: true,
      });
    }
  } catch (err) {
    if ((err as Error).message.includes("duplicate key")) {
      return { error: "That email address is already in use." };
    }
    throw err;
  }

  revalidatePath("/admin/users");
  return { ok: true, message: "Saved." };
}

export async function toggleUserActive(formData: FormData) {
  const admin = await requireRole("ADMIN");
  if (!admin) return;
  const id = String(formData.get("id") ?? "");
  if (id === admin.id) return; // don't let an admin lock themselves out
  await db
    .update(users)
    .set({ active: sql`not ${users.active}` })
    .where(eq(users.id, id));
  revalidatePath("/admin/users");
}

/* --------------------------------------------------------------- api keys */

export async function issueApiKey(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireRole("ADMIN");
  if (!admin) return { error: "Only an admin can issue API keys." };

  const label = String(formData.get("label") ?? "").trim() || "POS terminal";
  const { key, prefix } = createApiKey();

  await db.insert(apiKeys).values({
    id: createId(),
    label,
    prefix,
    keyHash: await bcrypt.hash(key, 10),
    active: true,
  });

  revalidatePath("/admin/settings");
  return {
    ok: true,
    secret: key,
    message: "Copy this key now — it is not shown again.",
  };
}

export async function revokeApiKey(formData: FormData) {
  const admin = await requireRole("ADMIN");
  if (!admin) return;
  await db
    .update(apiKeys)
    .set({ active: false })
    .where(eq(apiKeys.id, String(formData.get("id") ?? "")));
  revalidatePath("/admin/settings");
}

/* ------------------------------------------------------- categories/brands */

export async function createCategory(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("MANAGER");
  if (!user) return { error: "Not allowed." };
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const nameAr = String(formData.get("nameAr") ?? "").trim() || nameEn;
  if (!nameEn) return { error: "Enter a category name." };

  await db.insert(categories).values({
    id: createId(),
    slug: slugify(nameEn),
    nameEn,
    nameAr,
    icon: String(formData.get("icon") ?? "package"),
    sortOrder: 99,
  });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Category added." };
}

export async function createBrand(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("MANAGER");
  if (!user) return { error: "Not allowed." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter a brand name." };
  await db.insert(brands).values({ id: createId(), slug: slugify(name), name });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Brand added." };
}
