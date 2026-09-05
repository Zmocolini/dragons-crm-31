import Image from "next/image";
import type { PlatformKey } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/cn";

const SRC: Record<PlatformKey, string> = {
  bolt:  "/platforms/bolt.png",
  wolt:  "/platforms/wolt.png",
  glovo: "/platforms/glovo.png",
};

const LABEL: Record<PlatformKey, string> = {
  bolt:  "Bolt Food",
  wolt:  "Wolt",
  glovo: "Glovo",
};

export function PlatformLogo({
  platform,
  size = 40,
  rounded = "lg",
  className,
}: {
  platform: PlatformKey;
  size?: number;
  rounded?: "md" | "lg" | "xl" | "full";
  className?: string;
}) {
  const radiusClass =
    rounded === "full" ? "rounded-full"
    : rounded === "md" ? "rounded-md"
    : rounded === "xl" ? "rounded-xl"
    : "rounded-lg";

  return (
    <span
      className={cn("relative inline-block overflow-hidden", radiusClass, className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={SRC[platform]}
        alt={LABEL[platform]}
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

export function PlatformChip({
  platform,
  size = 20,
  showLabel = true,
  className,
}: {
  platform: PlatformKey;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-line bg-card-2/60 pl-1 pr-2 py-0.5 text-[11px] font-semibold text-fg",
        className,
      )}
    >
      <PlatformLogo platform={platform} size={size} rounded="md" />
      {showLabel && LABEL[platform]}
    </span>
  );
}
