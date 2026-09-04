"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Receipt,
  Users,
  Settings,
  ScanBarcode,
  Store,
  LogOut,
  Menu,
  X,
  ArrowLeftRight,
  Upload,
} from "lucide-react";
import { logoutAction } from "@/app/auth-actions";
import type { SessionUser } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/import", label: "Import", icon: Upload },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/movements", label: "Stock movements", icon: ArrowLeftRight },
  { href: "/admin/users", label: "Staff", icon: Users, adminOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => !n.adminOnly || user.role === "ADMIN");

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand-700 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <item.icon size={17} />
            {item.label}
          </Link>
        );
      })}

      <div className="my-3 h-px bg-white/10" />

      <Link
        href="/pos"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-emerald-300 hover:bg-white/5"
      >
        <ScanBarcode size={17} />
        Open POS
      </Link>
      <Link
        href="/"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 hover:text-white"
      >
        <Store size={17} />
        View storefront
      </Link>
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-ink-50 print:block print:bg-white">
      {/* desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col bg-ink-950 p-4 lg:flex print:hidden">
        <Link href="/admin" className="mb-6 flex flex-col gap-1.5 px-1">
  <span className="inline-flex w-fit rounded-lg bg-white p-1.5">
    <img src="/Navkar-Logo.jpg" alt="Navkar Trading" className="h-8 w-auto" />
  </span>
  <span className="text-[10px] text-ink-400">Back office</span>
</Link>

        {nav}

        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="px-3 text-sm font-medium text-white">{user.name}</p>
          <p className="px-3 text-xs text-ink-400">{user.role}</p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-300 hover:bg-white/5 hover:text-white"
            >
              <LogOut size={17} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-64 overflow-y-auto bg-ink-950 p-4">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-sm font-bold text-white">Navkar Trading</span>
              <button onClick={() => setOpen(false)} className="text-ink-300">
                <X size={20} />
              </button>
            </div>
            {nav}
            <form action={logoutAction} className="mt-6 border-t border-white/10 pt-4">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-300"
              >
                <LogOut size={17} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-ink-200 bg-white px-4 py-3 lg:hidden print:hidden">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-ink-600">
            <Menu size={20} />
          </button>
          <span className="text-sm font-bold text-ink-950">Navkar Trading — Admin</span>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
