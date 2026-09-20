
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function PageTransition() {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setIsTransitioning(false);
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest("a");

      if (!link) return;

      const href = link.getAttribute("href");

      if (!href) return;

      // Ignore external links
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return;
      }

      // Ignore anchors
      if (href.startsWith("#")) return;

      // Ignore new tabs
      if (link.target === "_blank") return;

      // Ignore Ctrl / Cmd / Shift / Alt clicks
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      // Ignore current page
      if (href === pathname) return;

      setIsTransitioning(true);
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [pathname]);

  if (!isTransitioning) return null;

  return (
    <div
      className="
        fixed
        bottom-5
        right-5
        z-[9999]
        flex
        items-center
        gap-3
        rounded-xl
        border
        border-gray-200
        bg-white
        px-4
        py-3
        shadow-lg
        animate-in
        fade-in
        slide-in-from-bottom-2
        duration-200
      "
    >
      {/* Navkar Logo */}
      <Image
        src="/Navkar-Logo.jpg"
        alt="Navkar Trading"
        width={90}
        height={36}
        priority
        className="h-8 w-auto object-contain"
      />

      {/* Loading indicator */}
      <div className="relative h-5 w-5">
        <div className="absolute inset-0 rounded-full border-2 border-gray-200" />

        <div
          className="
            absolute
            inset-0
            animate-spin
            rounded-full
            border-2
            border-transparent
            border-t-[#6C1C41]
          "
        />
      </div>
    </div>
  );
}
