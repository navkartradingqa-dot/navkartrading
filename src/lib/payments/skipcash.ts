import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentProvider, PaymentInitInput, PaymentInitResult } from "./types";

/**
 * Skipcash — Qatar hosted-checkout gateway (local debit/Himyan, Visa,
 * Mastercard, Apple Pay, Google Pay).
 *
 * Flow
 *   1. POST /api/v1/payments with an HMAC-SHA256 signature in Authorization.
 *   2. Skipcash replies with `payUrl`; we redirect the shopper there.
 *   3. Skipcash calls our webhook with the final status, signed the same way.
 *
 * The signature is an HMAC-SHA256 (base64) over the request fields joined as
 * `Key=Value` pairs in the exact order below — this ordering is mandated by
 * Skipcash, do not sort it alphabetically.
 *
 * ⚠️  Before going live, check the field list against the integration guide in
 *     your Skipcash merchant dashboard — they occasionally add fields, and an
 *     extra field changes the signature.
 */

const env = () => ({
  base: process.env.SKIPCASH_API_BASE || "https://api.skipcash.app",
  keyId: process.env.SKIPCASH_KEY_ID || "",
  secret: process.env.SKIPCASH_SECRET_KEY || "",
  clientId: process.env.SKIPCASH_CLIENT_ID || "",
  webhookKey: process.env.SKIPCASH_WEBHOOK_KEY || process.env.SKIPCASH_SECRET_KEY || "",
});

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64");
}

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return {
    first: parts[0] || "Customer",
    last: parts.slice(1).join(" ") || "-",
  };
}

export const skipcashProvider: PaymentProvider = {
  id: "skipcash",
  label: "Skipcash (Qatar cards, Apple Pay, Google Pay)",

  async init(input: PaymentInitInput): Promise<PaymentInitResult> {
    const { base, keyId, secret, clientId } = env();
    if (!keyId || !secret || !clientId) {
      return {
        ok: false,
        error:
          "Skipcash is not configured. Set SKIPCASH_KEY_ID, SKIPCASH_SECRET_KEY and SKIPCASH_CLIENT_ID, or switch PAYMENT_PROVIDER back to \"mock\".",
      };
    }

    const { first, last } = splitName(input.customerName);
    const body = {
      Uid: input.orderId,
      KeyId: keyId,
      Amount: Number(input.amount).toFixed(2),
      FirstName: first,
      LastName: last,
      Phone: input.customerPhone,
      Email: input.customerEmail || "noreply@navkartrading.qa",
      Street: "-",
      City: "Doha",
      State: "Doha",
      Country: "QA",
      PostalCode: "-",
      TransactionId: input.orderNumber,
      Custom1: input.orderNumber,
    };

    // Order matters — see the note at the top of this file.
    const toSign = [
      `Uid=${body.Uid}`,
      `KeyId=${body.KeyId}`,
      `Amount=${body.Amount}`,
      `FirstName=${body.FirstName}`,
      `LastName=${body.LastName}`,
      `Phone=${body.Phone}`,
      `Email=${body.Email}`,
      `Street=${body.Street}`,
      `City=${body.City}`,
      `State=${body.State}`,
      `Country=${body.Country}`,
      `PostalCode=${body.PostalCode}`,
      `TransactionId=${body.TransactionId}`,
      `Custom1=${body.Custom1}`,
    ].join(",");

    try {
      const res = await fetch(`${base}/api/v1/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: sign(toSign, secret),
countryCode: "QA",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      const json = (await res.json()) as {
        resultObj?: { id?: string; payUrl?: string; statusId?: number };
        returnCode?: number;
        errorMessage?: string;
        errors?: unknown;
      };

      if (!res.ok || !json.resultObj?.payUrl) {
        return {
          ok: false,
          error:
            json.errorMessage ??
            `Skipcash rejected the payment request (HTTP ${res.status}). Check your keys and the signature field order.`,
        };
      }

      return {
        ok: true,
        redirectUrl: json.resultObj.payUrl,
        providerRef: json.resultObj.id ?? input.orderNumber,
      };
    } catch (err) {
      return { ok: false, error: `Could not reach Skipcash: ${(err as Error).message}` };
    }
  },

  async parseWebhook(req, body) {
    const { webhookKey } = env();
    const provided = req.headers.get("authorization") ?? "";

    let data: {
      Id?: string;
      TransactionId?: string;
      Status?: string;
      StatusId?: number;
      Amount?: string;
      Custom1?: string;
      VisaId?: string;
      PaymentId?: string;
    };
    try {
      data = JSON.parse(body);
    } catch {
      return null;
    }

    if (webhookKey) {
      // Skipcash signs the flattened payload the same way as the request.
      const toSign = Object.entries(data)
        .filter(([, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}=${v}`)
        .join(",");
      const expected = sign(toSign, webhookKey);
      const a = Buffer.from(expected);
      const b = Buffer.from(provided);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        // Signature mismatch — refuse rather than trusting the caller.
        // If this fires in production, compare the exact field order with the
        // sample payload in your Skipcash dashboard.
        return null;
      }
    }

    const statusId = Number(data.StatusId ?? 0);
    const status =
      statusId === 2 || String(data.Status).toLowerCase() === "paid"
        ? "PAID"
        : statusId === 4 || statusId === 5
          ? "FAILED"
          : "PENDING";

    return {
      providerRef: data.Id ?? data.PaymentId ?? data.TransactionId ?? "",
      status,
      amount: data.Amount,
      raw: data,
    };
  },
};
