"use client";

import { useRouter } from "next/navigation";
import { NativeSelect } from "@/components/ui/native-select";

type BookableAsset = { id: string; assetTag: string; name: string };

export function BookingAssetSelect({ assets, selectedId }: { assets: BookableAsset[]; selectedId: string }) {
  const router = useRouter();

  return (
    <div className="w-64 space-y-1">
      <label htmlFor="booking-asset" className="text-xs font-medium text-muted-foreground">
        Resource
      </label>
      <NativeSelect
        id="booking-asset"
        value={selectedId}
        onChange={(e) => router.push(`/bookings?assetId=${e.target.value}`)}
      >
        {assets.map((a) => (
          <option key={a.id} value={a.id}>{a.assetTag} — {a.name}</option>
        ))}
      </NativeSelect>
    </div>
  );
}
