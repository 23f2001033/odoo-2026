"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import type { MaintenanceRow } from "./maintenance-list";

export function MaintenanceActions({
  request,
  canApprove,
  canProgress,
}: {
  request: MaintenanceRow;
  canApprove: boolean;
  canProgress: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"reject" | "assign" | "resolve" | null>(null);
  const [saving, setSaving] = useState(false);

  async function post(url: string, body?: unknown, successMsg?: string) {
    setSaving(true);
    try {
      await api.post(url, body);
      if (successMsg) toast.success(successMsg);
      setDialog(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setSaving(false);
    }
  }

  const base = `/api/v1/maintenance/${request.id}`;

  if (request.status === "PENDING" && canApprove) {
    return (
      <>
        <div className="space-x-2 text-right">
          <Button size="xs" disabled={saving} onClick={() => post(`${base}/approve`, undefined, "Request approved")}>
            Approve
          </Button>
          <Button size="xs" variant="outline" onClick={() => setDialog("reject")}>Reject</Button>
        </div>
        <RejectDialog
          open={dialog === "reject"}
          saving={saving}
          onClose={() => setDialog(null)}
          onSubmit={(reason) => post(`${base}/reject`, { rejectionReason: reason }, "Request rejected")}
        />
      </>
    );
  }

  if (request.status === "APPROVED" && canProgress) {
    return (
      <>
        <div className="text-right">
          <Button size="xs" onClick={() => setDialog("assign")}>Assign Technician</Button>
        </div>
        <AssignDialog
          open={dialog === "assign"}
          saving={saving}
          onClose={() => setDialog(null)}
          onSubmit={(name) => post(`${base}/assign`, { technicianName: name }, "Technician assigned")}
        />
      </>
    );
  }

  if (request.status === "ASSIGNED" && canProgress) {
    return (
      <div className="text-right">
        <Button size="xs" disabled={saving} onClick={() => post(`${base}/start`, undefined, "Work started")}>
          Start Progress
        </Button>
      </div>
    );
  }

  if (request.status === "IN_PROGRESS" && canProgress) {
    return (
      <>
        <div className="text-right">
          <Button size="xs" onClick={() => setDialog("resolve")}>Resolve</Button>
        </div>
        <ResolveDialog
          open={dialog === "resolve"}
          saving={saving}
          onClose={() => setDialog(null)}
          onSubmit={(notes) => post(`${base}/resolve`, { resolutionNotes: notes }, "Marked resolved — asset is back in service")}
        />
      </>
    );
  }

  return null;
}

function RejectDialog({
  open, saving, onClose, onSubmit,
}: { open: boolean; saving: boolean; onClose: () => void; onSubmit: (reason: string | null) => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Request</DialogTitle>
          <DialogDescription>Let the requester know why.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const reason = (new FormData(e.currentTarget).get("reason") as string) || null;
            onSubmit(reason);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input id="reason" name="reason" placeholder="e.g. covered under warranty, handle separately" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={saving}>{saving ? "Saving…" : "Reject"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignDialog({
  open, saving, onClose, onSubmit,
}: { open: boolean; saving: boolean; onClose: () => void; onSubmit: (name: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Technician</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget).get("technicianName") as string);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="technicianName">Technician / vendor name</Label>
            <Input id="technicianName" name="technicianName" required minLength={2} placeholder="CityTech Services" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Assign"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResolveDialog({
  open, saving, onClose, onSubmit,
}: { open: boolean; saving: boolean; onClose: () => void; onSubmit: (notes: string | null) => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Request</DialogTitle>
          <DialogDescription>The asset returns to service (Available, or back to its holder if allocated).</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const notes = (new FormData(e.currentTarget).get("resolutionNotes") as string) || null;
            onSubmit(notes);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="resolutionNotes">Resolution notes (optional)</Label>
            <Textarea id="resolutionNotes" name="resolutionNotes" rows={3} placeholder="What was done to fix it" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Resolve"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
