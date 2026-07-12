"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";

const ENTITY_TYPES = ["Asset", "User", "Department", "Category", "AuditCycle"];

export function ActivityFilters({ entityType, action }: { entityType: string; action: string }) {
  const router = useRouter();

  function push(next: { entityType: string; action: string }) {
    const params = new URLSearchParams();
    if (next.entityType) params.set("entityType", next.entityType);
    if (next.action) params.set("action", next.action);
    router.push(`/activity?tab=log&${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="w-44 space-y-1">
        <label htmlFor="act-entity" className="text-xs font-medium text-muted-foreground">Entity</label>
        <NativeSelect
          id="act-entity" value={entityType}
          onChange={(e) => push({ entityType: e.target.value, action })}
        >
          <option value="">All</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </NativeSelect>
      </div>
      <div className="w-56 space-y-1">
        <label htmlFor="act-action" className="text-xs font-medium text-muted-foreground">Action contains</label>
        <Input
          id="act-action" defaultValue={action} placeholder="e.g. transfer, allocated"
          onBlur={(e) => push({ entityType, action: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && push({ entityType, action: e.currentTarget.value })}
        />
      </div>
    </div>
  );
}
