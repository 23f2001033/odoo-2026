import { AuditResult } from "@prisma/client";
import { cn } from "@/lib/utils";

const STYLES: Record<AuditResult, string> = {
  PENDING: "bg-muted text-muted-foreground",
  VERIFIED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  MISSING: "bg-red-500/10 text-red-700 dark:text-red-400",
  DAMAGED: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const LABELS: Record<AuditResult, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  MISSING: "Missing",
  DAMAGED: "Damaged",
};

export function AuditResultBadge({ result }: { result: AuditResult }) {
  return (
    <span className={cn("inline-flex h-5 w-fit shrink-0 items-center rounded-4xl px-2 py-0.5 text-xs font-medium", STYLES[result])}>
      {LABELS[result]}
    </span>
  );
}
