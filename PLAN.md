# Navkar Trading — website, inventory & POS

**Domain:** navkartrading.qa · **Market:** Doha, Qatar · **Currency:** QAR
**Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Drizzle ORM · Postgres (Neon) · Vercel

This document is the plan behind the code in this repository: what was built, why
it is shaped this way, what it costs to run, and what still needs your decisions
before the shop goes live.

---

## 1. What this system is

One codebase running three things that share a single database:

| Surface | Who uses it | URL |
|---|---|---|
| **Storefront** | Customers, in English or Arabic | `navkartrading.qa` |
| **Back office** | Owner and inventory manager | `navkartrading.qa/admin` |
| **Counter POS** | Salesman at the till | `navkartrading.qa/pos` |

The important consequence: **there is one stock number.** When the salesman sells
the last iPhone case at the counter, the website shows it as out of stock the
moment the sale is rung up — and vice versa. This is the main reason to build the
shop and the till on one system rather than buying a separate POS.

An external POS machine can join the same stock pool through a REST API
(`/api/pos/v1/*`), authenticated with a key you issue from the admin panel.

---

## 2. Buying the domain — navkartrading.qa

`.qa` is administered by Qatar's **Communications Regulatory Authority (CRA)**
through the Qatar Domains Registry. You cannot buy it from GoDaddy or Namecheap
the way you would a `.com`; you go through a CRA-accredited registrar.

**Step 1 — check availability.** Search the name on the CRA registry:
<https://www.cra.gov.qa/en/regulatory-framework/domain-management/how-to-register-a-domain-name>

**Step 2 — pick an accredited registrar.** The CRA's current list:

| Registrar | Website |
|---|---|
| Qhost | <https://qhost.qa/qa-domain-name-registration/> |
| Ooredoo / Qatar Cloud | <https://qatarcloud.qa/> |
| Sadad | <https://sadad.qa/en/sadad-smart/> |
| Routedge | <https://www.routedge.net.qa/> |
| Unitech (Social Tech) | <https://www.unitech.qa/> |
| WAFRA IT | <https://www.wafra.net/> |
| Abu-Ghazaleh (TAG Domains) | <https://www.tagidomains.com/tagidomains/> |
| Badges | <https://badgs.com> |

Qhost is usually the quickest self-service option — you can complete the
registration online in a few minutes.

**Step 3 — what you'll need.** A plain `.qa` registration has no local-presence
requirement. If you also want `navkartrading.com.qa`, that one *does* require a
Qatari trade licence from the Ministry of Commerce and Industry, or a trademark
registered in Qatar. Registration is annual; Qatari organisations get pricing
that starts around **QAR 50/year**, though registrars add their own service fee.

**Step 4 — point it at Vercel.** Once you own the domain, add it in Vercel →
Project → Settings → Domains, and set these records at your registrar's DNS panel:

```
A      @      76.76.21.21
CNAME  www    cname.vercel-dns.com
```

Vercel will issue the SSL certificate automatically once DNS propagates
(usually under an hour, occasionally up to 24).

> Also register `navkartrading.com` defensively if it is free — customers will
> type it, and you can redirect it to the `.qa`.

---

## 3. Payments

### What Qatari customers actually use

Three payment paths cover almost every order in Doha:

1. **Cash on delivery** — still the most-used option for first-time buyers. Built
   in, no fees, no integration. The driver takes cash or carries a card terminal.
2. **Local cards** — NAPS / Himyan debit cards, plus Visa and Mastercard issued
   by QNB, CBQ, Doha Bank and others.
3. **Apple Pay / Google Pay** — increasingly expected on mobile.

### What is implemented

Payments go through a small adapter interface (`src/lib/payments/`), so swapping
or adding a gateway is one file, not a rewrite.

| Provider | Status | Notes |
|---|---|---|
| **Cash on delivery** | ✅ Live | Marked paid automatically when the order is delivered |
| **Mock gateway** | ✅ Default | Simulated bank page so you can test the whole flow today |
| **Skipcash** | ✅ Coded, needs your keys | Qatar gateway: local debit, Visa/Mastercard, Apple Pay, Google Pay |
| Dibsy / Fatora / QPay | Add later | Implement `PaymentProvider` and register it — roughly a 100-line file |

Right now `PAYMENT_PROVIDER=mock`. Card checkout sends the customer to an in-app
page that looks like a 3-D Secure step and lets you approve or decline. It calls
the same webhook a real gateway calls, so the order lifecycle you test is the one
that runs in production.

### Going live with cards

1. Apply for a **Skipcash merchant account** (<https://skipcash.app>). You will
   need your commercial registration (CR), trade licence, bank account details
   and ID. Approval typically takes a few working days.
2. Put the keys in Vercel's environment variables:
   `SKIPCASH_KEY_ID`, `SKIPCASH_SECRET_KEY`, `SKIPCASH_CLIENT_ID`,
   `SKIPCASH_WEBHOOK_KEY`.
3. Set `PAYMENT_PROVIDER=skipcash` and redeploy.
4. In the Skipcash dashboard, set the webhook URL to
   `https://navkartrading.qa/api/payments/skipcash/webhook`.
5. Run one real QAR 1 transaction end to end before announcing the shop.

**One thing to verify:** gateways occasionally change the field order used to
build the request signature. The order is documented at the top of
`src/lib/payments/skipcash.ts` — check it against the integration guide in your
merchant dashboard before your first live transaction.

---

## 4. The storefront

- **Bilingual, English and Arabic**, with a proper right-to-left layout when
  Arabic is selected. Language is a cookie, switchable from the header, and every
  product carries both an English and an Arabic name and description.
- **Home** — hero, 15 category tiles, today's deals, featured items, new arrivals.
- **Shop / category browse** — filter by category, brand, price range and stock;
  sort by price, name or newest; paginated 24 at a time.
- **Product page** — gallery, price with strike-through savings, live stock badge,
  specification table, warranty, related items, "ask on WhatsApp" button, and
  Schema.org Product markup so Google shows the price in search results.
- **Cart** — persists in the browser, free-delivery progress hint.
- **Checkout** — Qatari address format (zone / street / building), phone-first,
  cash-on-delivery or card, no account required. Guest checkout only, deliberately:
  forcing account creation is the single biggest drop-off point on a small shop.
- **Order tracking** — every order gets a code like `NT-7K2M-9QX4`. Customers can
  look up an order by that code, by order number, or by the mobile number they
  ordered with, and see a status timeline.

### Delivery rules

QAR 25 delivery, free over QAR 300, edit both in `src/lib/site.ts`. Counter sales
never carry a delivery fee.

---

## 5. Inventory & admin panel

Three roles:

| Role | Can do |
|---|---|
| **Admin** | Everything, including staff accounts and API keys |
| **Manager** | Products, stock, orders, POS |
| **Cashier** | POS only — cannot open the admin panel at all |

**Dashboard** — sales today / 7 days / 30 days, a 14-day bar chart, split between
website and counter revenue, stock value at cost and at retail, low-stock list,
best sellers, recent orders.

**Products** — full CRUD with bilingual fields, SKU, barcode, cost price, selling
price, compare-at price, specifications, images, warranty, reorder level, and
show/hide toggles. CSV export.

**Inventory** — filtered views (all / low / out of stock / in stock), one-tap ±1
corrections, and a proper adjustment dialog with a reason: goods received, stock
count correction, customer return, damaged/written off.

**Stock movements** — a complete audit trail. Every sale, delivery, return and
correction is a row: what changed, by how much, the balance afterwards, the
reference, and who did it. This is what lets you answer "where did those four
units go?" three weeks later.

**Orders** — filter by status, channel and search; a detail page with the full
timeline, one-click WhatsApp to the customer, a printable A4 invoice, and status
updates. Cancelling an order automatically returns every line to stock.

**Settings** — shop details, delivery rules, payment gateway status, POS terminal
API keys, and forms to add categories and brands.

### Preventing oversells

Stock is decremented inside a database transaction using a conditional update
(`UPDATE … WHERE stock >= qty`). If two customers buy the last unit at the same
moment, one succeeds and the other gets a clear "sold out while you were checking
out" message. The same guard protects the counter POS and the terminal API, so
the website and the till can never sell the same physical unit twice.

---

## 6. Point of sale

### At the counter (browser POS)

Runs at `/pos` on any laptop or tablet in the shop. Designed for a barcode gun:
the scanner input keeps itself focused, so the salesman can scan without touching
the mouse.

- Scan barcode or SKU, or tap products from a category grid
- Quantity control per line, order-level discount
- **Cash** with quick-tender buttons (50 / 100 / 200 / 500 / 1000 / exact) and
  automatic change calculation
- **Card** on the bank's own terminal
- **Split** payment — part cash, part card
- Optional customer name and phone
- **80 mm thermal receipt** that prints from the browser
- **Shift / cash drawer**: open with a float, see cash and card taken during the
  shift, close with a counted-cash figure so the end-of-day count reconciles

### For a physical POS machine

If you buy a standalone terminal, or add a second till, it can talk to the same
stock through a REST API — full reference in `docs/POS-API.md`:

| Endpoint | Purpose |
|---|---|
| `GET /api/pos/v1/products` | Catalogue feed, or one lookup by barcode/SKU |
| `POST /api/pos/v1/sales` | Record a counter sale (decrements stock) |
| `GET /api/pos/v1/stock` | Bulk stock levels, with `?since=` for incremental sync |
| `POST /api/pos/v1/stock` | Goods received, stock take, damage write-off |

Keys are issued in Admin → Settings, stored hashed, and can be revoked
individually.

---

## 7. Test data

The seed script builds **250 products** across 15 categories and 38 brands, with
realistic Doha retail pricing in QAR, SKUs, EAN-13 barcodes, bilingual names and
descriptions, specification tables, cost prices (so margin reports work), and
deliberately mixed stock levels — around 16 items out of stock and 18 low, so the
alerts have something to show. It also creates 12 sample orders across both
channels and three staff logins.

It is deterministic: re-running it produces the same catalogue.

**Replace it with your real stock** by editing products in the admin panel, or by
exporting the CSV, filling in your own rows, and importing them.

---

## 8. Deployment

```
GitHub repo  →  Vercel (auto-deploy on push)  →  navkartrading.qa
                     ↓
              Neon Postgres (free tier)
```

Step-by-step instructions are in `README.md`. In short: create a Neon database,
push this repo to GitHub, import it into Vercel, set the environment variables,
run `npm run db:push && npm run db:seed` once against the production database,
then attach the domain.

### Running costs

| Item | Cost |
|---|---|
| Domain `.qa` | ~QAR 50–250 / year, depending on registrar |
| Vercel Hobby | Free (fine to launch on) |
| Vercel Pro | ~USD 20 / month if you outgrow Hobby |
| Neon Postgres | Free tier is enough for a shop this size |
| Skipcash | Per-transaction fee — confirm the rate with them |
| **Realistic first year** | **Domain + gateway fees only** |

---

## 9. What to do before launch

Ordered by how much they block going live.

1. **Buy the domain** at an accredited registrar (section 2).
2. **Change the three seeded passwords** — admin, manager, cashier all share
   `SEED_ADMIN_PASSWORD` right now.
3. **Set a real `AUTH_SECRET`** (`openssl rand -base64 32`). Never reuse the
   example value.
4. **Fill in real shop details** — phone, WhatsApp, email, address, CR number —
   in the environment variables and in `src/lib/site.ts`.
5. **Replace the mock catalogue** with your real stock, cost prices and barcodes.
6. **Add real product photos.** Placeholder tiles look deliberate, but they will
   not sell a QAR 5,000 laptop.
7. **Apply for the Skipcash merchant account** and switch off the mock gateway.
8. **Have the four policy pages reviewed** — shipping, returns, privacy, terms.
   The privacy policy in particular should be checked against Qatar's Personal
   Data Privacy Protection Law (Law No. 13 of 2016). The current text is a
   starting draft, not legal advice.
9. **Test one real order end to end** — place it, pay QAR 1 by card, track it,
   deliver it, and confirm the stock moved.

## 10. Worth adding later

Not built, listed roughly in order of what a shop this size tends to want next:

- **WhatsApp order notifications** — automatic "your order is out for delivery"
  messages via the WhatsApp Business API. Probably the highest-value addition.
- **Customer accounts** with an order history and saved addresses.
- **Discount and coupon codes**, and simple bundle pricing.
- **Purchase orders and supplier records**, so goods-received links to an invoice.
- **Barcode label printing** from the admin panel.
- **Serial / IMEI tracking** for phones and laptops — genuinely useful for
  warranty claims.
- **Product reviews.**
- **Delivery-driver view** — a phone screen listing today's deliveries with a
  mark-as-delivered button.
- **Multi-branch stock**, if a second shop opens.
