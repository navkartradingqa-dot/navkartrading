# POS terminal API

For a physical POS machine, a second till, or a stock-take app. Everything here
writes to the same database the website and the browser POS use, so stock stays
in one place.

**Base URL:** `https://navkartrading.qa/api/pos/v1`

## Authentication

Issue a key in **Admin → Settings → POS terminal API keys**. It is shown once —
copy it then. Keys are stored hashed and can be revoked individually.

```
Authorization: Bearer ntk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

A single bootstrap key can also be set with the `POS_API_KEY` environment
variable, which is convenient for the first terminal.

Every endpoint returns `401` without a valid key.

---

## `GET /products`

Catalogue feed.

| Query | Meaning |
|---|---|
| `code` | Look up one item by barcode **or** SKU |
| `q` | Search by name, SKU or barcode |
| `category` | Filter by category slug, e.g. `mobile-phones` |
| `page`, `perPage` | Paging; `perPage` max 500, default 200 |

```bash
curl -H "Authorization: Bearer $KEY" \
  "https://navkartrading.qa/api/pos/v1/products?code=6280500052764"
```

```json
{
  "product": {
    "id": "msq4bm91...",
    "sku": "NT-AUD-0005",
    "barcode": "6280500052764",
    "name": "Anker AirPods 4 — Blue",
    "nameAr": "Anker إيربودز ٤ — أزرق",
    "price": "1254.00",
    "currency": "QAR",
    "stock": 77,
    "category": "audio",
    "brand": "Anker"
  }
}
```

Returns `404` when `code` matches nothing.

---

## `POST /sales`

Record a counter sale. Stock is decremented in the same transaction that writes
the order, so an oversell is impossible.

```json
{
  "items": [
    { "barcode": "6280500052764", "qty": 2 },
    { "sku": "NT-LAP-0001", "qty": 1 }
  ],
  "payment": "CASH",
  "cashReceived": "5000.00",
  "discount": "50.00",
  "customerName": "Ahmed",
  "customerPhone": "33445566",
  "cashierEmail": "cashier@navkartrading.qa",
  "terminalRef": "TERM1-0007"
}
```

| Field | Notes |
|---|---|
| `items[]` | Identify each line by `barcode`, `sku` or `productId`. Max 60 lines. |
| `payment` | `CASH`, `CARD_POS` or `SPLIT` |
| `cashAmount` / `cardAmount` | Required for `SPLIT` |
| `cashReceived` | For `CASH` — change is calculated and stored |
| `discount` | Order-level, in QAR |
| `cashierEmail` | Optional; attributes the sale to that staff member |
| `terminalRef` | Optional; your own reference, echoed back for reconciliation |

**201 Created**

```json
{
  "ok": true,
  "orderId": "msq58pvk...",
  "orderNumber": "NT-260812-0331",
  "subtotal": "2508.00",
  "discount": "0.00",
  "total": "2508.00",
  "currency": "QAR",
  "terminalRef": "TERM1-0007"
}
```

**Errors**

| Status | When |
|---|---|
| `422` | One or more barcodes/SKUs are not in the catalogue — the response lists them |
| `409` | Not enough stock; the message names the item and the quantity available |
| `400` | Malformed body |

---

## `GET /stock`

Bulk stock levels, for a terminal that caches the catalogue locally.

| Query | Meaning |
|---|---|
| `since` | ISO timestamp — only items changed since then |

```json
{
  "count": 250,
  "asOf": "2026-08-12T13:40:11.204Z",
  "items": [
    { "sku": "NT-AUD-0005", "barcode": "6280500052764", "stock": 75, "price": "1254.00", "updatedAt": "..." }
  ]
}
```

Poll this every few minutes with `since` set to the previous `asOf` and the
terminal stays in sync cheaply.

---

## `POST /stock`

Move stock — goods received, stock take, damage write-off.

```json
{
  "sku": "NT-AUD-0005",
  "delta": 5,
  "reason": "PURCHASE",
  "note": "Supplier invoice 8891"
}
```

Use `setTo` instead of `delta` for an absolute count from a stock take:

```json
{ "barcode": "6280500052764", "setTo": 80, "reason": "ADJUSTMENT" }
```

`reason` is one of `PURCHASE`, `ADJUSTMENT`, `RETURN`, `DAMAGE`. Every call
writes a row to the stock movement log, so the change is auditable in
Admin → Stock movements.

```json
{ "ok": true, "sku": "NT-AUD-0005", "stock": 80, "delta": 5 }
```

Returns `409` if the change would take stock below zero.

---

## Suggested terminal sync loop

1. On startup: `GET /products?perPage=500` and page through, cache locally.
2. Every 2–5 minutes: `GET /stock?since=<last asOf>` and patch the cache.
3. On each sale: `POST /sales` with a unique `terminalRef`.
4. If the network is down, queue sales locally and post them when it returns —
   `terminalRef` lets you spot anything posted twice.
