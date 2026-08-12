export type PaymentInitInput = {
  orderId: string;
  orderNumber: string;
  amount: string; // "1299.00"
  currency: string; // "QAR"
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  returnUrl: string; // where the bank sends the shopper back
  webhookUrl: string; // server-to-server confirmation
};

export type PaymentInitResult =
  | { ok: true; redirectUrl: string; providerRef: string }
  | { ok: false; error: string };

export type WebhookResult = {
  providerRef: string;
  orderId?: string;
  status: "PAID" | "FAILED" | "PENDING" | "REFUNDED";
  amount?: string;
  raw: unknown;
};

export interface PaymentProvider {
  /** Identifier stored on the payments row. */
  id: string;
  /** Human label shown in the admin panel. */
  label: string;
  /** Kick off a hosted-page payment and return where to send the shopper. */
  init(input: PaymentInitInput): Promise<PaymentInitResult>;
  /** Parse + verify an incoming webhook. Returns null when the signature fails. */
  parseWebhook(req: Request, body: string): Promise<WebhookResult | null>;
}
