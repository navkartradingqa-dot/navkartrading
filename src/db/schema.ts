import {
  pgTable,
  pgEnum,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { randomUUID } from "node:crypto";

/** Short, URL-safe, sortable-ish id. Kept local so drizzle-kit can parse this file standalone. */
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";
function createId(): string {
  const time = Date.now().toString(36).padStart(8, "0");
  const rand = randomUUID().replace(/-/g, "").slice(0, 14);
  return (time + rand)
    .split("")
    .map((c) => (ALPHABET.includes(c) ? c : "0"))
    .join("");
}

/* ------------------------------------------------------------------ enums */

export const movementTypeEnum = pgEnum("movement_type", [
  "PURCHASE",
  "SALE",
  "POS_SALE",
  "RETURN",
  "ADJUSTMENT",
  "DAMAGE",
  "INITIAL",
]);

export const orderChannelEnum = pgEnum("order_channel", ["ONLINE", "POS"]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "UNPAID",
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "COD",
  "CARD_ONLINE",
  "CARD_POS",
  "CASH",
  "SPLIT",
  "BANK_TRANSFER",
]);

export const roleEnum = pgEnum("role", ["ADMIN", "MANAGER", "CASHIER"]);

/* -------------------------------------------------------------- catalogue */

export const categories = pgTable(
  "categories",
  {
    id: varchar("id", { length: 32 }).primaryKey().$defaultFn(createId),
    slug: varchar("slug", { length: 120 }).notNull(),
    nameEn: varchar("name_en", { length: 160 }).notNull(),
    nameAr: varchar("name_ar", { length: 160 }).notNull(),
    icon: varchar("icon", { length: 60 }).notNull().default("package"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (t) => [uniqueIndex("categories_slug_idx").on(t.slug)],
);

export const brands = pgTable(
  "brands",
  {
    id: varchar("id", { length: 32 }).primaryKey().$defaultFn(createId),
    slug: varchar("slug", { length: 120 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
  },
  (t) => [uniqueIndex("brands_slug_idx").on(t.slug)],
);

export const products = pgTable(
  "products",
  {
    id: varchar("id", { length: 32 }).primaryKey().$defaultFn(createId),
    sku: varchar("sku", { length: 64 }).notNull(),
    barcode: varchar("barcode", { length: 64 }),
    slug: varchar("slug", { length: 200 }).notNull(),
    nameEn: varchar("name_en", { length: 250 }).notNull(),
    nameAr: varchar("name_ar", { length: 250 }).notNull(),
    descEn: text("desc_en").notNull().default(""),
    descAr: text("desc_ar").notNull().default(""),
    categoryId: varchar("category_id", { length: 32 })
      .notNull()
      .references(() => categories.id),
    brandId: varchar("brand_id", { length: 32 }).references(() => brands.id),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    compareAtPrice: numeric("compare_at_price", { precision: 10, scale: 2 }),
    cost: numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
    stock: integer("stock").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    warrantyMonths: integer("warranty_months").notNull().default(12),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    specs: jsonb("specs").$type<Record<string, string>>().notNull().default({}),
    active: boolean("active").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_sku_idx").on(t.sku),
    uniqueIndex("products_slug_idx").on(t.slug),
    index("products_barcode_idx").on(t.barcode),
    index("products_category_idx").on(t.categoryId),
    index("products_brand_idx").on(t.brandId),
    index("products_active_featured_idx").on(t.active, t.featured),
  ],
);

/* -------------------------------------------------------------- inventory */

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: varchar("id", { length: 32 }).primaryKey().$defaultFn(createId),
    productId: varchar("product_id", { length: 32 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    balance: integer("balance").notNull(),
    type: movementTypeEnum("type").notNull(),
    reference: varchar("reference", { length: 80 }),
    note: text("note"),
    userId: varchar("user_id", { length: 32 }).references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("movements_product_idx").on(t.productId, t.createdAt),
    index("movements_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ users */

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 32 }).primaryKey().$defaultFn(createId),
    email: varchar("email", { length: 190 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("CASHIER"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const posShifts = pgTable(
  "pos_shifts",
  {
    id: varchar("id", { length: 32 }).primaryKey().$defaultFn(createId),
    userId: varchar("user_id", { length: 32 })
      .notNull()
      .references(() => users.id),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    openingFloat: numeric("opening_float", { precision: 10, scale: 2 }).notNull().default("0"),
    countedCash: numeric("counted_cash", { precision: 10, scale: 2 }),
    note: text("note"),
  },
  (t) => [index("shifts_user_idx").on(t.userId, t.openedAt)],
);

/* ----------------------------------------------------------------- orders */

export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 32 }).primaryKey().$defaultFn(createId),
    orderNumber: varchar("order_number", { length: 40 }).notNull(),
    trackingToken: varchar("tracking_token", { length: 40 }).notNull(),
    channel: orderChannelEnum("channel").notNull().default("ONLINE"),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("UNPAID"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("COD"),

    customerName: varchar("customer_name", { length: 160 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 40 }).notNull().default(""),
    customerEmail: varchar("customer_email", { length: 190 }),

    addressLine: text("address_line"),
    zone: varchar("zone", { length: 20 }),
    streetNumber: varchar("street_number", { length: 20 }),
    buildingNumber: varchar("building_number", { length: 20 }),
    city: varchar("city", { length: 80 }).default("Doha"),
    notes: text("notes"),

    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("QAR"),

    cashReceived: numeric("cash_received", { precision: 10, scale: 2 }),
    changeGiven: numeric("change_given", { precision: 10, scale: 2 }),
    cardAmount: numeric("card_amount", { precision: 10, scale: 2 }),
    cashAmount: numeric("cash_amount", { precision: 10, scale: 2 }),

    cashierId: varchar("cashier_id", { length: 32 }).references(() => users.id),
    shiftId: varchar("shift_id", { length: 32 }).references(() => posShifts.id),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.orderNumber),
    uniqueIndex("orders_token_idx").on(t.trackingToken),
    index("orders_created_idx").on(t.createdAt),
    index("orders_status_idx").on(t.status),
    index("orders_phone_idx").on(t.customerPhone),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: varchar("id", { length: 32 }).primaryKey().$defaultFn(createId),
    orderId: varchar("order_id", { length: 32 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 32 }).references(() => products.id),
    sku: varchar("sku", { length: 64 }).notNull(),
    nameEn: varchar("name_en", { length: 250 }).notNull(),
    nameAr: varchar("name_ar", { length: 250 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    qty: integer("qty").notNull(),
    lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: varchar("id", { length: 32 }).primaryKey().$defaultFn(createId),
    orderId: varchar("order_id", { length: 32 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

export const payments = pgTable(
  "payments",
  {
    id: varchar("id", { length: 32 }).primaryKey().$defaultFn(createId),
    orderId: varchar("order_id", { length: 32 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 40 }).notNull(),
    providerRef: varchar("provider_ref", { length: 190 }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    raw: jsonb("raw"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId), index("payments_ref_idx").on(t.providerRef)],
);

/* -------------------------------------------------------------- api keys */

export const apiKeys = pgTable(
  "api_keys",
  {
    id: varchar("id", { length: 32 }).primaryKey().$defaultFn(createId),
    label: varchar("label", { length: 120 }).notNull(),
    keyHash: text("key_hash").notNull(),
    prefix: varchar("prefix", { length: 16 }).notNull(),
    active: boolean("active").notNull().default(true),
    lastUsed: timestamp("last_used", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("api_keys_hash_idx").on(t.keyHash)],
);

export const settings = pgTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: jsonb("value").notNull(),
});

/* -------------------------------------------------------------- relations */

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  movements: many(stockMovements),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  items: many(orderItems),
  events: many(orderEvents),
  payments: many(payments),
  cashier: one(users, { fields: [orders.cashierId], references: [users.id] }),
  shift: one(posShifts, { fields: [orders.shiftId], references: [posShifts.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, { fields: [stockMovements.productId], references: [products.id] }),
  user: one(users, { fields: [stockMovements.userId], references: [users.id] }),
}));

export const posShiftsRelations = relations(posShifts, ({ one, many }) => ({
  user: one(users, { fields: [posShifts.userId], references: [users.id] }),
  orders: many(orders),
}));

/* ------------------------------------------------------------------ types */

export type Category = typeof categories.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type User = typeof users.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type PosShift = typeof posShifts.$inferSelect;
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type Role = (typeof roleEnum.enumValues)[number];
export type MovementType = (typeof movementTypeEnum.enumValues)[number];
export type OrderChannel = (typeof orderChannelEnum.enumValues)[number];
