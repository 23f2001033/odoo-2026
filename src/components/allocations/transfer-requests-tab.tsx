"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TransferStatus } from "@prisma/client";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export type TransferRow = {
  id: string;
  status: TransferStatus;
  reason: string | null;
  decisionNote: string | null;
  createdAt: string;
  asset: { id: string; assetTag: string; name: string };
  requestedBy: { id: string; name: string };
  targetUser: { id: string; name: string } | null;
  targetDept: { id: string; name: string } | null;
  decidedBy: { id: string; name: string } | null;
};

const STATUS_VARIANT: Record<TransferStatus, "secondary" | "outline" | "destructive"> = {
  REQUESTED: "secondary",
  APPROVED: "outline",
  COMPLETED: "outline",
  REJECTED: "destructive",
};

export function TransferRequestsTab({
  transfers,
  canApprove,
  currentUserId,
}: {
  transfers: TransferRow[];
  canApprove: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [deciding, setDeciding] = useState<{ transfer: TransferRow; action: "approve" | "reject" } | null>(null);
  const [saving, setSaving] = useState(false);

  async function onDecide(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!deciding) return;
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      if (deciding.action === "approve") {
        const expectedReturnAt = (form.get("expectedReturnAt") as string) || null;
        await api.post(`/api/v1/transfers/${deciding.transfer.id}/approve`, { expectedReturnAt });
        toast.success("Transfer approved — allocation history updated");
      } else {
        const decisionNote = (form.get("decisionNote") as string) || null;
        await api.post(`/api/v1/transfers/${deciding.transfer.id}/reject`, { decisionNote });
        toast.success("Transfer rejected");
      }
      setDeciding(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Decided By</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.map((t) => {
              const canDecide = canApprove && t.status === "REQUESTED" && t.requestedBy.id !== currentUserId;
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    <Link href={`/assets/${t.asset.id}`} className="hover:underline">
                      {t.asset.assetTag}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{t.asset.name}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.requestedBy.name}</TableCell>
                  <TableCell>{t.targetUser?.name ?? t.targetDept?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">{t.reason ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                    {t.status === "REJECTED" && t.decisionNote && (
                      <span className="block text-xs text-muted-foreground">{t.decisionNote}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.decidedBy?.name ?? "—"}</TableCell>
                  <TableCell className="space-x-2 text-right">
                    {canDecide && (
                      <>
                        <Button size="xs" onClick={() => setDeciding({ transfer: t, action: "approve" })}>
                          Approve
                        </Button>
                        <Button
                          size="xs" variant="outline"
                          onClick={() => setDeciding({ transfer: t, action: "reject" })}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {transfers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No transfer requests.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deciding} onOpenChange={(o) => !o && setDeciding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deciding?.action === "approve" ? "Approve Transfer" : "Reject Transfer"}
            </DialogTitle>
            <DialogDescription>
              {deciding?.transfer.asset.assetTag} → {" "}
              {deciding?.transfer.targetUser?.name ?? deciding?.transfer.targetDept?.name}
            </DialogDescription>
          </DialogHeader>
          {deciding && (
            <form onSubmit={onDecide} className="space-y-4">
              {deciding.action === "approve" ? (
                <div className="space-y-2">
                  <Label htmlFor="expectedReturnAt">Expected Return Date (optional)</Label>
                  <Input id="expectedReturnAt" name="expectedReturnAt" type="date" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="decisionNote">Reason for rejection (optional)</Label>
                  <Input id="decisionNote" name="decisionNote" placeholder="Let the requester know why" />
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDeciding(null)}>Cancel</Button>
                <Button type="submit" disabled={saving} variant={deciding.action === "reject" ? "destructive" : "default"}>
                  {saving ? "Saving…" : deciding.action === "approve" ? "Approve" : "Reject"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
