"use server";

import { redirect } from "next/navigation";
import { login, destroySession } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Enter your email and password." };

  const user = await login(email, password);
  if (!user) return { error: "That email and password combination is not recognised." };

  const fallback = user.role === "CASHIER" ? "/pos" : "/admin";
  redirect(next && next.startsWith("/") ? next : fallback);
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}
