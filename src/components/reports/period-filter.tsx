"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";

// "One row, above the charts... filters scope everything below them" per
// the dataviz skill's interaction spec. Scopes utilization, maintenance
// frequency, and the booking heatmap; the attention list and department
// summary are point-in-time by design and stay unaffected.
export function PeriodFilter({ periodDays }: { periodDays: number }) {
  const router = useRouter();

  return (
    <div className="w-48 space-y-1">
      <label htmlFor="report-period" className="text-xs font-medium text-muted-foreground">
        Period
      </label>
      <NativeSelect
        id="report-period"
        value={String(periodDays)}
        onChange={(e) => router.push(`/reports?periodDays=${e.target.value}`)}
      >
        <option value="30">Last 30 days</option>
        <option value="90">Last 90 days</option>
        <option value="365">Last year</option>
      </NativeSelect>
    </div>
  );
}
