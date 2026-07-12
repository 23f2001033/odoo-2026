"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

type BookableAsset = { id: string; assetTag: string; name: string };
type Dept = { id: string; name: string };

export function NewBookingDialog({
  assets,
  defaultAssetId,
  departments,
}: {
  assets: BookableAsset[];
  defaultAssetId: string;
  departments: Dept[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      assetId: form.get("assetId") as string,
      startsAt: form.get("startsAt") as string,
      endsAt: form.get("endsAt") as string,
      forDeptId: (form.get("forDeptId") as string) || null,
      purpose: (form.get("purpose") as string) || null,
    };
    setSaving(true);
    try {
      await api.post("/api/v1/bookings", payload);
      toast.success("Booking confirmed");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Booking failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>New Booking</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Booking</DialogTitle>
            <DialogDescription>Overlapping slots for the same resource are rejected automatically.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assetId">Resource</Label>
              <NativeSelect id="assetId" name="assetId" defaultValue={defaultAssetId} required>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.assetTag} — {a.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Starts</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Ends</Label>
                <Input id="endsAt" name="endsAt" type="datetime-local" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose (optional)</Label>
              <Input id="purpose" name="purpose" placeholder="Team standup, client call, …" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forDeptId">On behalf of department (optional)</Label>
              <NativeSelect id="forDeptId" name="forDeptId" defaultValue="">
                <option value="">— just me —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </NativeSelect>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Booking…" : "Book"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
