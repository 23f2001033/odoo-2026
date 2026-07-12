"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";

export function MaintenanceFilters({ status, priority }: { status: string; priority: string }) {
  const router = useRouter();

  function push(next: { status: string; priority: string }) {
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.priority) params.set("priority", next.priority);
    router.push(`/maintenance?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="w-48 space-y-1">
        <label htmlFor="maint-status" className="text-xs font-medium text-muted-foreground">Status</label>
        <NativeSelect
          id="maint-status" value={status}
          onChange={(e) => push({ status: e.target.value, priority })}
        >
          <option value="">All</option>
          <option value="ACTIVE">Active (open tickets)</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="REJECTED">Rejected</option>
        </NativeSelect>
      </div>
      <div className="w-40 space-y-1">
        <label htmlFor="maint-priority" className="text-xs font-medium text-muted-foreground">Priority</label>
        <NativeSelect
          id="maint-priority" value={priority}
          onChange={(e) => push({ status, priority: e.target.value })}
        >
          <option value="">All</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </NativeSelect>
      </div>
    </div>
  );
}
