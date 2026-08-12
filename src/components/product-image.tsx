/**
 * Product imagery.
 *
 * The seed catalogue ships without photos, so when `images` is empty we draw a
 * deterministic gradient tile with the product initials — it keeps the grid
 * looking intentional instead of showing broken image icons. Upload real
 * photos from Admin → Products and this falls away automatically.
 */

const PALETTES: [string, string][] = [
  ["#8f1f43", "#d04566"],
  ["#1f4c8f", "#4589d0"],
  ["#1f8f6b", "#45d0a5"],
  ["#8f6b1f", "#d0a545"],
  ["#5b1f8f", "#9a45d0"],
  ["#8f4a1f", "#d07b45"],
  ["#1f6b8f", "#45a5d0"],
  ["#3d3d4a", "#7a7a90"],
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

function initials(name: string) {
  const cleaned = name.replace(/[^A-Za-z0-9\s]/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (!words.length) return "NT";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function ProductImage({
  name,
  images,
  seed,
  className = "",
  rounded = true,
}: {
  name: string;
  images?: string[] | null;
  seed?: string;
  className?: string;
  rounded?: boolean;
}) {
  const url = images?.[0];
  const radius = rounded ? "rounded-xl" : "";

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={name}
        loading="lazy"
        className={`${radius} h-full w-full bg-white object-contain ${className}`}
      />
    );
  }

  const key = seed || name;
  const [from, to] = PALETTES[hash(key) % PALETTES.length];

  return (
    <div
      className={`${radius} flex h-full w-full items-center justify-center ${className}`}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      aria-label={name}
      role="img"
    >
      <span className="text-2xl font-bold tracking-wider text-white/90 select-none sm:text-3xl">
        {initials(name)}
      </span>
    </div>
  );
}
