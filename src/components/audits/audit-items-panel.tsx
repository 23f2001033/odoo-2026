"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AssetStatus, AuditResult } from "@prisma/client";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AuditResultBadge } from "./audit-result-badge";
import { AuditQrScanner } from "./audit-qr-scanner";

export type AuditItemRow = {
  id: string;
  result: AuditResult;
  notes: string | null;
  checkedAt: string | null;
  checkedBy: { name: string } | null;
  asset: { id: string; assetTag: string; name: string; status: AssetStatus; location: string | null };
};

export function AuditItemsPanel({
  cycleId,
  items,
  canCheck,
}: {
  cycleId: string;
  items: AuditItemRow[];
  canCheck: boolean;
}) {
  const router = useRouter();
  const [flagging, setFlagging] = useState<{ item: AuditItemRow; result: "MISSING" | "DAMAGED" } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function check(itemId: string, result: AuditResult, notes: string | null) {
    setSaving(true);
    setPendingId(itemId);
    try {
      await api.post(`/api/v1/audit-cycles/${cycleId}/items/${itemId}/check`, { result, notes });
      router.refresh();
      return true;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to record check");
      return false;
    } finally {
      setSaving(false);
      setPendingId(null);
    }
  }

  async function onVerify(item: AuditItemRow) {
    const ok = await check(item.id, "VERIFIED", null);
    if (ok) toast.success(`${item.asset.assetTag} verified`);
  }

  // Scanning the physical QR label means the item was found — the natural
  // one-tap mapping for a walkthrough is scan = verified. Missing/Damaged
  // (nothing to scan, or found-but-broken) still go through the manual
  // per-row buttons, which is the only way to convey those outcomes.
  async function onScan(tag: string) {
    const item = items.find((i) => i.asset.assetTag === tag);
    if (!item) {
      toast.error(`${tag} is not in this audit cycle's scope`);
      return;
    }
    await onVerify(item);
  }

  async function onFlagSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!flagging) return;
    const notes = (new FormData(e.currentTarget).get("notes") as string) || null;
    const ok = await check(flagging.item.id, flagging.result, notes);
    if (ok) {
      toast.success(`${flagging.item.asset.assetTag} marked ${flagging.result.toLowerCase()}`);
      setFlagging(null);
    }
  }

  return (
    <div className="space-y-4">
      {canCheck && (
        <div className="flex justify-end">
          <AuditQrScanner onScan={onScan} />
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Checked By</TableHead>
              {canCheck && <TableHead className="w-64" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.asset.assetTag}
                  <span className="block text-xs text-muted-foreground">{item.asset.name}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.asset.location ?? "—"}</TableCell>
                <TableCell>
                  <AuditResultBadge result={item.result} />
                  {item.notes && <span className="block max-w-48 truncate text-xs text-muted-foreground">{item.notes}</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{item.checkedBy?.name ?? "—"}</TableCell>
                {canCheck && (
                  <TableCell className="space-x-1.5 text-right">
                    <Button
                      size="xs" disabled={saving && pendingId === item.id}
                      onClick={() => onVerify(item)}
                    >
                      Verify
                    </Button>
                    <Button
                      size="xs" variant="outline"
                      onClick={() => setFlagging({ item, result: "MISSING" })}
                    >
                      Missing
                    </Button>
                    <Button
                      size="xs" variant="outline"
                      onClick={() => setFlagging({ item, result: "DAMAGED" })}
                    >
                      Damaged
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={canCheck ? 5 : 4} className="py-10 text-center text-muted-foreground">
                  No assets in this cycle&apos;s scope.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!flagging} onOpenChange={(o) => !o && setFlagging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {flagging?.item.asset.assetTag} as {flagging?.result.toLowerCase()}</DialogTitle>
            <DialogDescription>This will appear on the cycle&apos;s discrepancy report.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onFlagSubmit} className="space-y-4">
            <Textarea name="notes" rows={3} placeholder="Any details worth recording (optional)" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFlagging(null)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={saving}>
                {saving ? "Saving…" : `Mark ${flagging?.result === "MISSING" ? "Missing" : "Damaged"}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
