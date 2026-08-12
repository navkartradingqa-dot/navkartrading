import type { PaymentProvider } from "./types";

/**
 * Test gateway. Sends the shopper to an in-app page that looks like a bank
 * 3-D Secure step and lets you choose success or failure. Use this until the
 * Skipcash (or other) merchant account is live — the rest of the checkout,
 * webhook and order flow is identical.
 */
export const mockProvider: PaymentProvider = {
  id: "mock",
  label: "Test gateway (no real money)",

  async init(input) {
    const url = new URL(input.returnUrl);
    // The simulated bank page lives inside the app.
    const pay = new URL("/pay/simulate", url.origin);
    pay.searchParams.set("order", input.orderId);
    pay.searchParams.set("amount", input.amount);
    pay.searchParams.set("ref", `MOCK-${input.orderNumber}`);
    return { ok: true, redirectUrl: pay.toString(), providerRef: `MOCK-${input.orderNumber}` };
  },

  async parseWebhook(_req, body) {
    try {
      const data = JSON.parse(body) as {
        orderId?: string;
        ref?: string;
        status?: string;
        amount?: string;
      };
      if (!data.orderId) return null;
      return {
        providerRef: data.ref ?? `MOCK-${data.orderId}`,
        orderId: data.orderId,
        status: data.status === "PAID" ? "PAID" : "FAILED",
        amount: data.amount,
        raw: data,
      };
    } catch {
      return null;
    }
  },
};
