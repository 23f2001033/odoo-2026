"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { AssetCondition } from "@prisma/client";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import type { FieldDef } from "@/components/org/categories-tab";

type EditableAsset = {
  id: string;
  name: string;
  serialNumber: string | null;
  acquisitionDate: string | null; // yyyy-mm-dd
  acquisitionCost: number | null;
  condition: AssetCondition;
  location: string | null;
  isBookable: boolean;
  photoUrl: string | null;
  attributes: Record<string, string | number>;
};

const CONDITIONS: AssetCondition[] = ["NEW", "GOOD", "FAIR", "POOR"];

export function AssetDetailActions({
  asset,
  fieldDefs,
  locations,
  canRetire,
  canDispose,
}: {
  asset: EditableAsset;
  fieldDefs: FieldDef[];
  locations: string[];
  canRetire: boolean;
  canDispose: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(asset.photoUrl);
  const [uploading, setUploading] = useState(false);
  const [attrs, setAttrs] = useState<Record<string, string>>(
    Object.fromEntries(fieldDefs.map((f) => [f.key, String(asset.attributes[f.key] ?? "")]))
  );
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

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
    } finally {
      setUploading(false);
    }
  }

  async function onSubmitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")),
      serialNumber: (form.get("serialNumber") as string) || null,
      acquisitionDate: (form.get("acquisitionDate") as string) || null,
      acquisitionCost: form.get("acquisitionCost") ? Number(form.get("acquisitionCost")) : null,
      condition: form.get("condition") as AssetCondition,
      location: (form.get("location") as string) || null,
      isBookable: form.get("isBookable") === "on",
      photoUrl,
      attributes: attrs,
    };
    setSaving(true);
    try {
      await api.patch(`/api/v1/assets/${asset.id}`, payload);
      toast.success("Asset updated");
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onTransition(kind: "retire" | "dispose") {
    setTransitioning(true);
    try {
      await api.post(`/api/v1/assets/${asset.id}/${kind}`);
      toast.success(kind === "retire" ? "Asset retired" : "Asset disposed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setTransitioning(false);
    }
  }

  return (
    <div className="flex shrink-0 gap-2">
      <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>Edit</Button>
      {canRetire && (
        <Button size="sm" variant="outline" disabled={transitioning} onClick={() => onTransition("retire")}>
          Retire
        </Button>
      )}
      {canDispose && (
        <Button size="sm" variant="destructive" disabled={transitioning} onClick={() => onTransition("dispose")}>
          Dispose
        </Button>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {asset.name}</DialogTitle>
            <DialogDescription>Category and asset tag can&apos;t be changed after registration.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmitEdit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" name="name" defaultValue={asset.name} required minLength={2} />
            </div>

            {fieldDefs.length > 0 && (
              <div className="space-y-3 rounded-md bg-muted/40 p-3">
                {fieldDefs.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label htmlFor={`edit-attr-${f.key}`}>{f.label}</Label>
                    <Input
                      id={`edit-attr-${f.key}`}
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      value={attrs[f.key] ?? ""}
                      onChange={(e) => setAttrs((a) => ({ ...a, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-serial">Serial Number</Label>
                <Input id="edit-serial" name="serialNumber" defaultValue={asset.serialNumber ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-condition">Condition</Label>
                <NativeSelect id="edit-condition" name="condition" defaultValue={asset.condition}>
                  {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Acquisition Date</Label>
                <Input id="edit-date" name="acquisitionDate" type="date" defaultValue={asset.acquisitionDate ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cost">Acquisition Cost</Label>
                <Input
                  id="edit-cost" name="acquisitionCost" type="number" min="0" step="0.01"
                  defaultValue={asset.acquisitionCost ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input id="edit-location" name="location" list="edit-locations" defaultValue={asset.location ?? ""} />
              <datalist id="edit-locations">
                {locations.map((l) => <option key={l} value={l} />)}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-photo">Photo</Label>
              <Input id="edit-photo" type="file" accept="image/*" onChange={onPhotoSelected} disabled={uploading} />
              {photoUrl && (
                <Image src={photoUrl} alt="Preview" width={64} height={64} className="rounded border object-cover" />
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isBookable" defaultChecked={asset.isBookable} className="size-4 accent-primary" />
              Shared/bookable resource
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || uploading}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
