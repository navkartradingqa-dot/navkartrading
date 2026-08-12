"use client";

import Link from "next/link";
import {
  Laptop,
  Smartphone,
  Tablet,
  Cable,
  Headphones,
  Watch,
  Keyboard,
  Monitor,
  HardDrive,
  Wifi,
  Gamepad2,
  Camera,
  Printer,
  BatteryCharging,
  House,
  Package,
  type LucideIcon,
} from "lucide-react";
import { useLocale } from "@/i18n/client";

const ICONS: Record<string, LucideIcon> = {
  laptop: Laptop,
  smartphone: Smartphone,
  tablet: Tablet,
  cable: Cable,
  headphones: Headphones,
  watch: Watch,
  keyboard: Keyboard,
  monitor: Monitor,
  "hard-drive": HardDrive,
  wifi: Wifi,
  "gamepad-2": Gamepad2,
  camera: Camera,
  printer: Printer,
  "battery-charging": BatteryCharging,
  house: House,
  package: Package,
};

export function CategoryTiles({
  categories,
}: {
  categories: { slug: string; nameEn: string; nameAr: string; icon: string; count: number }[];
}) {
  const { locale } = useLocale();

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8">
      {categories.map((c) => {
        const Icon = ICONS[c.icon] ?? Package;
        return (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="card group flex flex-col items-center gap-2 p-4 text-center transition hover:border-brand-300 hover:shadow-sm"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700 transition group-hover:bg-brand-700 group-hover:text-white">
              <Icon size={20} />
            </span>
            <span className="text-xs leading-tight font-medium text-ink-800">
              {locale === "ar" ? c.nameAr : c.nameEn}
            </span>
            <span className="text-[10px] text-ink-400">{c.count}</span>
          </Link>
        );
      })}
    </div>
  );
}
