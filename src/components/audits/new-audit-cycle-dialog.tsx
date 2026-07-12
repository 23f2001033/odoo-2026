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

type Person = { id: string; name: string };

export function NewAuditCycleDialog({
  departments,
  users,
}: {
  departments: Person[];
  users: Person[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scopeType, setScopeType] = useState<"none" | "dept" | "location">("none");
  const [auditorIds, setAuditorIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function toggleAuditor(id: string) {
    setAuditorIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (auditorIds.length === 0) {
      toast.error("Assign at least one auditor");
      return;
    }
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name") as string,
      scopeDeptId: scopeType === "dept" ? (form.get("scopeDeptId") as string) : null,
      scopeLocation: scopeType === "location" ? (form.get("scopeLocation") as string) : null,
      startsAt: form.get("startsAt") as string,
      endsAt: form.get("endsAt") as string,
      auditorUserIds: auditorIds,
    };
    setSaving(true);
    try {
      const cycle = await api.post<{ id: string }>("/api/v1/audit-cycles", payload);
      toast.success("Audit cycle created");
      setOpen(false);
      router.push(`/audits/${cycle.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create audit cycle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>New Audit Cycle</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Audit Cycle</DialogTitle>
            <DialogDescription>In-scope assets are snapshotted into the cycle at creation.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="name">Cycle name</Label>
              <Input id="name" name="name" placeholder="Q3 Floor-1 Audit" required minLength={2} />
            </div>

            <div className="space-y-2">
              <Label>Scope</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={scopeType === "none"} onChange={() => setScopeType("none")} className="accent-primary" />
                  Org-wide
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={scopeType === "dept"} onChange={() => setScopeType("dept")} className="accent-primary" />
                  Department
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={scopeType === "location"} onChange={() => setScopeType("location")} className="accent-primary" />
                  Location
                </label>
              </div>
              {scopeType === "dept" && (
                <NativeSelect name="scopeDeptId" required defaultValue="">
                  <option value="" disabled>Select a department…</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </NativeSelect>
              )}
              {scopeType === "location" && (
                <Input name="scopeLocation" placeholder="HQ Floor 1" required />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Starts</Label>
                <Input id="startsAt" name="startsAt" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Ends</Label>
                <Input id="endsAt" name="endsAt" type="date" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Auditors</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={auditorIds.includes(u.id)}
                      onChange={() => toggleAuditor(u.id)}
                      className="size-4 accent-primary"
                    />
                    {u.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{auditorIds.length} selected</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create Cycle"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
