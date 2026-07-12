"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AssetStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { QrScannerDialog } from "./qr-scanner-dialog";

const STATUS_OPTIONS: { value: AssetStatus; label: string }[] = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ALLOCATED", label: "Allocated" },
  { value: "RESERVED", label: "Reserved" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "LOST", label: "Lost" },
  { value: "RETIRED", label: "Retired" },
  { value: "DISPOSED", label: "Disposed" },
];

export type AssetFiltersValue = {
  q: string;
  categoryId: string;
  status: string;
  departmentId: string;
  location: string;
  bookable: boolean;
};

type Props = {
  initial: AssetFiltersValue;
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  locations: string[];
};

// Reads its initial state from server-provided props (not useSearchParams),
// so it never needs a Suspense boundary and stays simple. Every change
// pushes a fresh query string; the server component re-runs the search.
export function AssetFilters({ initial, categories, departments, locations }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(next: AssetFiltersValue) {
    const params = new URLSearchParams();
    if (next.q) params.set("q", next.q);
    if (next.categoryId) params.set("categoryId", next.categoryId);
    if (next.status) params.set("status", next.status);
    if (next.departmentId) params.set("departmentId", next.departmentId);
    if (next.location) params.set("location", next.location);
    if (next.bookable) params.set("bookable", "true");
    router.push(`/assets?${params.toString()}`);
  }

  function onChange(patch: Partial<AssetFiltersValue>) {
    const next = { ...value, ...patch };
    setValue(next);
    push(next);
  }

  function onTextChange(field: "q" | "location", text: string) {
    const next = { ...value, [field]: text };
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => push(next), 350);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1 space-y-1">
        <label htmlFor="asset-q" className="text-xs font-medium text-muted-foreground">
          Search
        </label>
        <Input
          id="asset-q"
          placeholder="Tag, serial number, or name…"
          value={value.q}
          onChange={(e) => onTextChange("q", e.target.value)}
        />
      </div>

      <div className="w-40 space-y-1">
        <label htmlFor="asset-category" className="text-xs font-medium text-muted-foreground">
          Category
        </label>
        <NativeSelect
          id="asset-category"
          value={value.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NativeSelect>
      </div>

      <div className="w-44 space-y-1">
        <label htmlFor="asset-status" className="text-xs font-medium text-muted-foreground">
          Status
        </label>
        <NativeSelect
          id="asset-status"
          value={value.status}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </NativeSelect>
      </div>

      <div className="w-40 space-y-1">
        <label htmlFor="asset-dept" className="text-xs font-medium text-muted-foreground">
          Department
        </label>
        <NativeSelect
          id="asset-dept"
          value={value.departmentId}
          onChange={(e) => onChange({ departmentId: e.target.value })}
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </NativeSelect>
      </div>

      <div className="w-40 space-y-1">
        <label htmlFor="asset-location" className="text-xs font-medium text-muted-foreground">
          Location
        </label>
        <Input
          id="asset-location"
          list="asset-locations"
          placeholder="Any location"
          value={value.location}
          onChange={(e) => onTextChange("location", e.target.value)}
        />
        <datalist id="asset-locations">
          {locations.map((l) => <option key={l} value={l} />)}
        </datalist>
      </div>

      <label className="flex h-8 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={value.bookable}
          onChange={(e) => onChange({ bookable: e.target.checked })}
        />
        Bookable only
      </label>

      <QrScannerDialog />
    </div>
  );
}
