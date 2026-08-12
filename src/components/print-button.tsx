"use client";

import { Printer } from "lucide-react";

export function PrintButton({
  label = "Print",
  className = "btn-primary text-sm",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <Printer size={15} />
      {label}
    </button>
  );
}
