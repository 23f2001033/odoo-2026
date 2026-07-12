"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

export function CloseCycleButton({ cycleId, uncheckedCount }: { cycleId: string; uncheckedCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onClose() {
    setSaving(true);
    try {
      await api.post(`/api/v1/audit-cycles/${cycleId}/close`);
      toast.success("Audit cycle closed");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to close cycle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="destructive" onClick={() => setOpen(true)}>Close Cycle</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this audit cycle?</DialogTitle>
            <DialogDescription>
              This locks the cycle. Missing items become <strong>Lost</strong>; damaged items get an
              auto-raised maintenance request.
              {uncheckedCount > 0 && (
                <span className="mt-2 block text-amber-600 dark:text-amber-400">
                  {uncheckedCount} asset{uncheckedCount > 1 ? "s are" : " is"} still unchecked and will remain
                  Pending in the closed cycle&apos;s report.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={saving} onClick={onClose}>
              {saving ? "Closing…" : "Close Cycle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
