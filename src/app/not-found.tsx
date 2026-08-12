import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="text-6xl font-black text-brand-700">404</p>
        <h1 className="mt-3 text-xl font-bold text-ink-950">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm text-ink-500">
          The product may have been removed, or the link may be out of date.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-primary">
            Go home
          </Link>
          <Link href="/shop" className="btn-ghost">
            Browse the shop
          </Link>
        </div>
      </div>
    </div>
  );
}
