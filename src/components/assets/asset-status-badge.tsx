import { AssetStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

// Badge's built-in variants (default/secondary/destructive/outline) don't
// cover all 7 lifecycle states with distinct semantic colors, so this maps
// each status to explicit classes instead of overloading `variant`.
const STYLES: Record<AssetStatus, string> = {
  AVAILABLE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  ALLOCATED: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  RESERVED: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  UNDER_MAINTENANCE: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  LOST: "bg-red-500/10 text-red-700 dark:text-red-400",
  RETIRED: "bg-muted text-muted-foreground",
  DISPOSED: "bg-muted text-muted-foreground line-through",
};

const LABELS: Record<AssetStatus, string> = {
  AVAILABLE: "Available",
  ALLOCATED: "Allocated",
  RESERVED: "Reserved",
  UNDER_MAINTENANCE: "Under Maintenance",
  LOST: "Lost",
  RETIRED: "Retired",
  DISPOSED: "Disposed",
};

export function AssetStatusBadge({ status, className }: { status: AssetStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center rounded-4xl px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[status],
        className
      )}
    >
      {LABELS[status]}
    </span>
  );
}
