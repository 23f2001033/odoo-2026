"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";

// URL-synced status filter — same pattern as AssetFilters (component reads
// its initial state from server-provided props, never useSearchParams).
export function AllocationFilters({ status }: { status: string }) {
  const router = useRouter();

  function onChange(next: string) {
    router.push(next ? `/allocations?status=${next}` : "/allocations");
  }

  return (
    <div className="w-48 space-y-1">
      <label htmlFor="alloc-status" className="text-xs font-medium text-muted-foreground">
        Status
      </label>
      <NativeSelect id="alloc-status" value={status} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        <option value="ACTIVE">Active</option>
        <option value="OVERDUE">Overdue</option>
        <option value="RETURNED">Returned</option>
      </NativeSelect>
    </div>
  );
}
