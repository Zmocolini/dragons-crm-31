import { cn } from "@/lib/utils/cn";

const GRADIENTS = [
  "from-indigo-600 to-purple-700",
  "from-emerald-700 to-teal-700",
  "from-sky-700 to-cyan-700",
  "from-rose-600 to-pink-700",
  "from-amber-700 to-orange-700",
  "from-violet-600 to-fuchsia-700",
];

function hashIndex(str: string, mod: number) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function Avatar({
  name,
  size = 28,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const grad = GRADIENTS[hashIndex(name, GRADIENTS.length)];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white",
        grad,
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.36)),
      }}
    >
      {initials}
    </span>
  );
}
