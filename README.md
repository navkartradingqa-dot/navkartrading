# Navkar Trading

E-commerce storefront, inventory back office and counter POS for an electronics
shop in Doha, Qatar — one codebase, one database, one stock figure.

- **Storefront** — bilingual EN/AR, 250 seeded products, cash on delivery and
  online card payment, public order tracking
- **Admin** — dashboard, products, inventory with a full movement audit trail,
  orders, staff, settings
- **POS** — browser till with barcode scanning, cash/card/split, thermal receipt,
  shift cash-up — plus a REST API for a physical POS machine

The full plan, including how to buy `navkartrading.qa` and how to go live with
payments, is in [`PLAN.md`](./PLAN.md).

---

## Run it locally

**Requires:** Node 20+ and a Postgres database (a free [Neon](https://neon.tech)
project is the easiest).

```bash
npm install
cp .env.example .env.local     # then fill in DATABASE_URL and AUTH_SECRET
npm run db:push                # create the tables
npm run db:seed                # load 250 products, 3 staff logins, sample orders
npm run dev
```

Open <http://localhost:3000>.

| Where | URL | Login |
|---|---|---|
| Storefront | `/` | — |
| Admin | `/admin` | `admin@navkartrading.qa` |
| POS | `/pos` | `cashier@navkartrading.qa` |

All three seeded accounts use the password in `SEED_ADMIN_PASSWORD`
(`Navkar@2026` by default). **Change them before going live.**

---

## Environment variables

| Variable | Required | What it is |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres connection string. On Neon, use the **pooled** one. |
| `AUTH_SECRET` | ✅ | Random 32+ character string. `openssl rand -base64 32` |
| `SEED_ADMIN_PASSWORD` | seed only | Password given to the three seeded accounts |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://navkartrading.qa` |
| `NEXT_PUBLIC_SHOP_PHONE` | | Shown in the header and footer |
| `NEXT_PUBLIC_SHOP_WHATSAPP` | | Digits only, e.g. `97455512345` |
| `NEXT_PUBLIC_SHOP_EMAIL` | | Shown in the footer and on invoices |
| `PAYMENT_PROVIDER` | | `mock` (default) or `skipcash` |
| `SKIPCASH_*` | for live cards | Keys from your Skipcash merchant dashboard |
| `POS_API_KEY` | | Optional bootstrap key for the first POS terminal |

Without `AUTH_SECRET` the admin and POS sign-in pages will error — it is the one
variable people forget on the first Vercel deploy.

---

## Deploy to GitHub + Vercel + navkartrading.qa

### 1. Create the database

Sign up at [neon.tech](https://neon.tech), create a project in the closest region
(**Frankfurt / eu-central-1** is a good choice for Qatar), and copy the **pooled**
connection string.

### 2. Push to GitHub

```bash
git init
git add .
git commit -m "Navkar Trading — storefront, inventory and POS"
git branch -M main
git remote add origin https://github.com/<your-username>/navkartrading.git
git push -u origin main
```

### 3. Import into Vercel

1. <https://vercel.com/new> → import the repository
2. Framework preset: **Next.js** (detected automatically)
3. Add every environment variable from the table above
4. Deploy

### 4. Create the tables and load data — once

From your machine, pointing at the production database:

```bash
DATABASE_URL="<your-neon-pooled-url>" npm run db:push
DATABASE_URL="<your-neon-pooled-url>" SEED_ADMIN_PASSWORD="<a-strong-password>" npm run db:seed
```

Skip `db:seed` if you would rather start with an empty catalogue and add your own
products from the admin panel.

### 5. Attach the domain

Buy `navkartrading.qa` from a CRA-accredited registrar (see `PLAN.md` §2), then
in Vercel → Settings → Domains add `navkartrading.qa` and `www.navkartrading.qa`,
and set at your registrar:

```
A      @      76.76.21.21
CNAME  www    cname.vercel-dns.com
```

SSL is issued automatically once DNS propagates.

---

## Project layout

```
src/
  app/
    (storefront)/        home, shop, category, product, cart, checkout, track, order
    admin/(panel)/       dashboard, products, inventory, movements, orders, users, settings
    pos/                 counter till + shift actions
    api/
      checkout/          public checkout
      payments/          gateway webhooks
      pos/v1/            REST API for an external POS machine
      admin/export/      CSV exports
  components/            UI, shared between storefront, admin and POS
  db/                    Drizzle schema and connection
  lib/
    catalog.ts           product queries
    orders.ts            order creation, stock movement, status changes
    payments/            gateway adapters (mock, skipcash)
    auth.ts              JWT sessions, roles
    money.ts             integer-fils arithmetic — no float rounding on bills
  i18n/                  English + Arabic dictionaries
scripts/
  catalogue.ts           the 250-product mock catalogue generator
  seed.ts                seeding
docs/POS-API.md          external POS terminal API reference
PLAN.md                  the full project plan
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:push` | Create/update tables from the schema |
| `npm run db:seed` | Load the mock catalogue and sample orders |
| `npm run db:reset` | Drop everything, recreate, reseed |
| `npm run typecheck` | TypeScript check |

## A note on money

Every amount is stored as `numeric(10,2)` and handled in integer fils
(1 QAR = 100 fils) in `src/lib/money.ts`. Nothing in this codebase adds prices as
floating-point numbers, because `0.1 + 0.2` is how shops end up with bills that
are one fil out.
