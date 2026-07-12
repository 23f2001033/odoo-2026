"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AssetCondition, AssetStatus } from "@prisma/client";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { HolderPicker, Person } from "@/components/assets/holder-picker";

type Props = {
  assetId: string;
  assetStatus: AssetStatus;
  activeAllocation: { id: string; holderUserId: string | null; holderLabel: string } | null;
  canAllocate: boolean;
  canReturnApprove: boolean;
  // Employees may only request a transfer to themselves (server-enforced too
  // — see requestTransfer in modules/allocation/service.ts); everyone else
  // can pick any employee or department.
  canTargetOthers: boolean;
  currentUserId: string;
  currentUserName: string;
  employees: Person[];
  departments: Person[];
};

const CONDITIONS: AssetCondition[] = ["NEW", "GOOD", "FAIR", "POOR"];

export function AllocationActions({
  assetId,
  assetStatus,
  activeAllocation,
  canAllocate,
  canReturnApprove,
  canTargetOthers,
  currentUserId,
  currentUserName,
  employees,
  departments,
}: Props) {
  const router = useRouter();
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [holderKind, setHolderKind] = useState<"user" | "dept">("user");
  const [targetKind, setTargetKind] = useState<"user" | "dept">("user");
  const [saving, setSaving] = useState(false);

  async function onAllocate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      assetId,
      holderUserId: holderKind === "user" ? (form.get("holderId") as string) : null,
      holderDeptId: holderKind === "dept" ? (form.get("holderId") as string) : null,
      expectedReturnAt: (form.get("expectedReturnAt") as string) || null,
    };
    setSaving(true);
    try {
      await api.post("/api/v1/allocations", payload);
      toast.success("Asset allocated");
      setAllocateOpen(false);
      router.refresh();
    } catch (err) {
      // Race: someone else allocated it between page load and submit — the
      // UI recovers on refresh (Allocate button disappears, Request Transfer
      // appears in its place, matching the asset's new real status).
      if (err instanceof ApiError && err.code === "CONFLICT") {
        toast.error(err.message);
        setAllocateOpen(false);
        router.refresh();
      } else {
        toast.error(err instanceof ApiError ? err.message : "Allocation failed");
      }
    } finally {
      setSaving(false);
    }
  }

  async function onRequestTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeAllocation) return;
    const form = new FormData(e.currentTarget);
    const payload = {
      allocationId: activeAllocation.id,
      targetUserId: targetKind === "user" ? (form.get("targetId") as string) : null,
      targetDeptId: targetKind === "dept" ? (form.get("targetId") as string) : null,
      reason: (form.get("reason") as string) || null,
    };
    setSaving(true);
    try {
      await api.post("/api/v1/transfers", payload);
      toast.success("Transfer requested");
      setTransferOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Transfer request failed");
    } finally {
      setSaving(false);
    }
  }

  async function onRequestReturn() {
    if (!activeAllocation) return;
    setSaving(true);
    try {
      await api.post(`/api/v1/allocations/${activeAllocation.id}/request-return`);
      toast.success("Return requested — the asset manager has been notified");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Request failed");
    } finally {
      setSaving(false);
    }
  }

  async function onProcessReturn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeAllocation) return;
    const form = new FormData(e.currentTarget);
    const payload = {
      returnCondition: form.get("returnCondition") as AssetCondition,
      returnNotes: (form.get("returnNotes") as string) || null,
    };
    setSaving(true);
    try {
      await api.post(`/api/v1/allocations/${activeAllocation.id}/return`, payload);
      toast.success("Asset returned");
      setReturnOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Return failed");
    } finally {
      setSaving(false);
    }
  }

  const isHolder = activeAllocation?.holderUserId === currentUserId;

  return (
    <div className="flex flex-wrap gap-2">
      {assetStatus === "AVAILABLE" && canAllocate && (
        <Button size="sm" onClick={() => setAllocateOpen(true)}>Allocate</Button>
      )}
      {activeAllocation && canReturnApprove && (
        <Button size="sm" variant="outline" onClick={() => setReturnOpen(true)}>Process Return</Button>
      )}
      {activeAllocation && isHolder && !canReturnApprove && (
        <Button size="sm" variant="outline" disabled={saving} onClick={onRequestReturn}>
          Request Return
        </Button>
      )}
      {/* Hidden for the current holder — requesting a transfer to yourself
          is a no-op; holders use Return / Request Return instead. */}
      {activeAllocation && !isHolder && (
        <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>Request Transfer</Button>
      )}

      {/* Allocate dialog */}
      <Dialog open={allocateOpen} onOpenChange={setAllocateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Asset</DialogTitle>
            <DialogDescription>Assign this asset to an employee or a department.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onAllocate} className="space-y-4">
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
              <Button type="button" variant="outline" onClick={() => setAllocateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Allocating…" : "Allocate"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Transfer dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Transfer</DialogTitle>
            <DialogDescription>
              Currently held by <strong>{activeAllocation?.holderLabel}</strong>. An Asset Manager
              or Department Head must approve this request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onRequestTransfer} className="space-y-4">
            {canTargetOthers ? (
              <HolderPicker
                kind={targetKind}
                onKindChange={setTargetKind}
                employees={employees}
                departments={departments}
                fieldName="targetId"
                defaultUserId={currentUserId}
              />
            ) : (
              <div className="space-y-2">
                <Label>Requesting for</Label>
                <p className="rounded-md border bg-muted/40 px-3 py-1.5 text-sm">{currentUserName} (you)</p>
                <input type="hidden" name="targetId" value={currentUserId} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input id="reason" name="reason" placeholder="Why do you need this asset?" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Requesting…" : "Request Transfer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Process Return dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
            <DialogDescription>Capture the condition check-in before releasing this asset.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onProcessReturn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="returnCondition">Condition on return</Label>
              <NativeSelect id="returnCondition" name="returnCondition" defaultValue="GOOD">
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnNotes">Notes (optional)</Label>
              <Input id="returnNotes" name="returnNotes" placeholder="Any damage or issues noted at check-in" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Confirm Return"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
