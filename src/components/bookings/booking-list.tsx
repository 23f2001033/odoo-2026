"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

export type BookingRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  purpose: string | null;
  displayStatus: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  bookedBy: { id: string; name: string; departmentId: string | null };
  forDept: { id: string; name: string } | null;
};

type CurrentUser = { id: string; role: "ADMIN" | "ASSET_MANAGER" | "DEPT_HEAD" | "EMPLOYEE"; departmentId: string | null };

const STATUS_VARIANT: Record<BookingRow["displayStatus"], "secondary" | "outline" | "destructive" | "default"> = {
  UPCOMING: "secondary",
  ONGOING: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Mirrors canManageBooking in modules/booking/service.ts — the backend is
// the real gate, this just avoids showing a button that would 403.
function canManage(user: CurrentUser, booking: BookingRow): boolean {
  if (booking.bookedBy.id === user.id) return true;
  if (user.role === "ASSET_MANAGER" || user.role === "ADMIN") return true;
  if (user.role === "DEPT_HEAD") {
    return booking.forDept?.id === user.departmentId || booking.bookedBy.departmentId === user.departmentId;
  }
  return false;
}

export function BookingList({ bookings, currentUser }: { bookings: BookingRow[]; currentUser: CurrentUser }) {
  const router = useRouter();
  const [rescheduling, setRescheduling] = useState<BookingRow | null>(null);
  const [saving, setSaving] = useState(false);

  async function onCancel(id: string) {
    setSaving(true);
    try {
      await api.post(`/api/v1/bookings/${id}/cancel`);
      toast.success("Booking cancelled");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Cancel failed");
    } finally {
      setSaving(false);
    }
  }

  async function onReschedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rescheduling) return;
    const form = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await api.post(`/api/v1/bookings/${rescheduling.id}/reschedule`, {
        startsAt: form.get("startsAt") as string,
        endsAt: form.get("endsAt") as string,
      });
      toast.success("Booking rescheduled");
      setRescheduling(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Reschedule failed");
    } finally {
      setSaving(false);
    }
  }

  const showActionsColumn = bookings.some((b) => canManage(currentUser, b));

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Booked By</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Status</TableHead>
            {showActionsColumn && <TableHead className="w-44" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((b) => {
            const mine = canManage(currentUser, b);
            return (
              <TableRow key={b.id}>
                <TableCell className="text-sm">
                  {new Date(b.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  {" – "}
                  {new Date(b.endsAt).toLocaleTimeString(undefined, { timeStyle: "short" })}
                </TableCell>
                <TableCell>
                  {b.bookedBy.name}
                  {b.forDept && <span className="block text-xs text-muted-foreground">for {b.forDept.name}</span>}
                </TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground">{b.purpose ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[b.displayStatus]}>{b.displayStatus}</Badge>
                </TableCell>
                {showActionsColumn && (
                  <TableCell className="space-x-2 text-right">
                    {mine && b.displayStatus !== "CANCELLED" && b.displayStatus !== "COMPLETED" && (
                      <>
                        <Button size="xs" variant="outline" onClick={() => setRescheduling(b)}>Reschedule</Button>
                        <Button size="xs" variant="ghost" disabled={saving} onClick={() => onCancel(b.id)}>Cancel</Button>
                      </>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
          {bookings.length === 0 && (
            <TableRow>
              <TableCell colSpan={showActionsColumn ? 5 : 4} className="py-10 text-center text-muted-foreground">
                No bookings for this resource yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!rescheduling} onOpenChange={(o) => !o && setRescheduling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
            <DialogDescription>Overlapping slots are rejected automatically.</DialogDescription>
          </DialogHeader>
          {rescheduling && (
            <form onSubmit={onReschedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="r-startsAt">Starts</Label>
                  <Input
                    id="r-startsAt" name="startsAt" type="datetime-local" required
                    defaultValue={toLocalInputValue(rescheduling.startsAt)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-endsAt">Ends</Label>
                  <Input
                    id="r-endsAt" name="endsAt" type="datetime-local" required
                    defaultValue={toLocalInputValue(rescheduling.endsAt)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRescheduling(null)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
