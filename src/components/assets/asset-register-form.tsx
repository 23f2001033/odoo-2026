"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { AssetCondition } from "@prisma/client";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { FieldDef } from "@/components/org/categories-tab";

type Category = { id: string; name: string; fieldDefs: FieldDef[] };

type Asset = { id: string; assetTag: string };

const CONDITIONS: AssetCondition[] = ["NEW", "GOOD", "FAIR", "POOR"];

export function AssetRegisterForm({
  categories,
  locations,
}: {
  categories: Category[];
  locations: string[];
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const category = useMemo(() => categories.find((c) => c.id === categoryId), [categories, categoryId]);

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/v1/uploads", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new ApiError(json?.error?.message ?? "Upload failed");
      setPhotoUrl(json.data.url);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Photo upload failed");
      e.target.value = "";
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!categoryId) {
      toast.error("Select a category first");
      return;
    }
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")),
      categoryId,
      serialNumber: (form.get("serialNumber") as string) || null,
      acquisitionDate: (form.get("acquisitionDate") as string) || null,
      acquisitionCost: form.get("acquisitionCost") ? Number(form.get("acquisitionCost")) : null,
      condition: form.get("condition") as AssetCondition,
      location: (form.get("location") as string) || null,
      isBookable: form.get("isBookable") === "on",
      photoUrl,
      attributes,
    };

    setSaving(true);
    try {
      const asset = await api.post<Asset>("/api/v1/assets", payload);
      toast.success(`${asset.assetTag} registered`);
      router.push(`/assets/${asset.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border p-5">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Dell Latitude 5440" required minLength={2} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <NativeSelect
          id="category"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setAttributes({});
          }}
          required
        >
          <option value="" disabled>Select a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NativeSelect>
      </div>

      {category && category.fieldDefs.length > 0 && (
        <div className="space-y-3 rounded-md bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">{category.name} details</p>
          {category.fieldDefs.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`attr-${f.key}`}>{f.label}</Label>
              <Input
                id={`attr-${f.key}`}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                value={attributes[f.key] ?? ""}
                onChange={(e) => setAttributes((a) => ({ ...a, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="serialNumber">Serial Number</Label>
          <Input id="serialNumber" name="serialNumber" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="condition">Condition</Label>
          <NativeSelect id="condition" name="condition" defaultValue="GOOD">
            {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="acquisitionDate">Acquisition Date</Label>
          <Input id="acquisitionDate" name="acquisitionDate" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="acquisitionCost">Acquisition Cost</Label>
          <Input id="acquisitionCost" name="acquisitionCost" type="number" min="0" step="0.01" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" list="reg-locations" placeholder="HQ Floor 2" />
        <datalist id="reg-locations">
          {locations.map((l) => <option key={l} value={l} />)}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label htmlFor="photo">Photo (optional)</Label>
        <Input id="photo" type="file" accept="image/*" onChange={onPhotoSelected} disabled={uploading} />
        {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
        {photoUrl && (
          <Image src={photoUrl} alt="Preview" width={80} height={80} className="rounded border object-cover" />
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isBookable" className="size-4 accent-primary" />
        This is a shared/bookable resource (room, vehicle, equipment)
      </label>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="submit" disabled={saving || uploading}>
          {saving ? "Registering…" : "Register Asset"}
        </Button>
      </div>
    </form>
  );
}
