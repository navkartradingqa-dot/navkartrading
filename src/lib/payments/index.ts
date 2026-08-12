import { mockProvider } from "./mock";
import { skipcashProvider } from "./skipcash";
import type { PaymentProvider } from "./types";

const registry: Record<string, PaymentProvider> = {
  mock: mockProvider,
  skipcash: skipcashProvider,
};

/**
 * Which online gateway is live, from PAYMENT_PROVIDER. Adding another Qatar
 * gateway (Dibsy, Fatora, QPay/QNB) means writing one file that implements
 * PaymentProvider and registering it here — nothing else in the app changes.
 */
export function getPaymentProvider(): PaymentProvider {
  const id = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
  return registry[id] ?? mockProvider;
}

export function isLiveGateway() {
  return getPaymentProvider().id !== "mock";
}

export type { PaymentProvider } from "./types";
