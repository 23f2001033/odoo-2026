import { MaintenancePriority } from "@prisma/client";
import { cn } from "@/lib/utils";

const STYLES: Record<MaintenancePriority, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  HIGH: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  CRITICAL: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export function MaintenancePriorityBadge({ priority }: { priority: MaintenancePriority }) {
  return (
    <span className={cn("inline-flex h-5 w-fit shrink-0 items-center rounded-4xl px-2 py-0.5 text-xs font-medium", STYLES[priority])}>
      {priority}
    </span>
  );
}
