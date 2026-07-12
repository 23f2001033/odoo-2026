"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { MaintenancePriority } from "@prisma/client";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

type Asset = { id: string; assetTag: string; name: string };

const PRIORITIES: MaintenancePriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function RaiseMaintenanceDialog({ assets, defaultAssetId }: { assets: Asset[]; defaultAssetId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      assetId: form.get("assetId") as string,
      title: form.get("title") as string,
      description: form.get("description") as string,
      priority: form.get("priority") as MaintenancePriority,
      photoUrl,
    };
    setSaving(true);
    try {
      await api.post("/api/v1/maintenance", payload);
      toast.success("Maintenance request raised");
      setOpen(false);
      setPhotoUrl(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to raise request");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={assets.length === 0}>
        Raise Maintenance Request
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Maintenance Request</DialogTitle>
            <DialogDescription>An Asset Manager must approve before repair work begins.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assetId">Asset</Label>
              <NativeSelect id="assetId" name="assetId" defaultValue={defaultAssetId} required>
                <option value="" disabled>Select an asset…</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.assetTag} — {a.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Issue summary</Label>
              <Input id="title" name="title" placeholder="Screen flickering" required minLength={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description" name="description" required rows={3}
                placeholder="What's wrong, when it started, anything you've already tried…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <NativeSelect id="priority" name="priority" defaultValue="MEDIUM">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo">Photo (optional)</Label>
              <Input id="photo" type="file" accept="image/*" onChange={onPhotoSelected} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
              {photoUrl && (
                <Image src={photoUrl} alt="Preview" width={80} height={80} className="rounded border object-cover" />
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || uploading}>{saving ? "Submitting…" : "Submit"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
