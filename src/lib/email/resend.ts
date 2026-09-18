import "server-only";
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM =
  process.env.EMAIL_FROM ??
  "Navkar Trading <navkartrading.com></navkartrading.com>";

export const ADMIN_ORDER_EMAIL = process.env.ADMIN_ORDER_EMAIL ?? "";
