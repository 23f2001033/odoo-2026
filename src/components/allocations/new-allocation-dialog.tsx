"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { HolderPicker, Person } from "@/components/assets/holder-picker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

type AvailableAsset = { id: string; assetTag: string; name: string };

export function NewAllocationDialog({
  availableAssets,
  employees,
  departments,
}: {
  availableAssets: AvailableAsset[];
  employees: Person[];
  departments: Person[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [holderKind, setHolderKind] = useState<"user" | "dept">("user");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      assetId: form.get("assetId") as string,
      holderUserId: holderKind === "user" ? (form.get("holderId") as string) : null,
      holderDeptId: holderKind === "dept" ? (form.get("holderId") as string) : null,
      expectedReturnAt: (form.get("expectedReturnAt") as string) || null,
    };
    setSaving(true);
    try {
      await api.post("/api/v1/allocations", payload);
      toast.success("Asset allocated");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Allocation failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} disabled={availableAssets.length === 0}>
        New Allocation
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Allocation</DialogTitle>
            <DialogDescription>Assign an available asset to an employee or a department.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assetId">Asset</Label>
              <NativeSelect id="assetId" name="assetId" required defaultValue="">
                <option value="" disabled>Select an available asset…</option>
                {availableAssets.map((a) => (
                  <option key={a.id} value={a.id}>{a.assetTag} — {a.name}</option>
                ))}
              </NativeSelect>
            </div>
            <HolderPicker
              kind={holderKind}
              onKindChange={setHolderKind}
              employees={employees}
              departments={departments}
              fieldName="holderId"
            />
            <div className="space-y-2">
              <Label htmlFor="expectedReturnAt">Expected Return Date (optional)</Label>
              <Input id="expectedReturnAt" name="expectedReturnAt" type="date" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Allocating…" : "Allocate"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
