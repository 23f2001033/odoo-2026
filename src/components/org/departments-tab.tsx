"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Dept = {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  head: { id: string; name: string } | null;
  parent: { id: string; name: string } | null;
  members: number;
};

type Props = {
  departments: Dept[];
  userOptions: { id: string; name: string }[];
};

export function DepartmentsTab({ departments, userOptions }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(d: Dept) {
    setEditing(d);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name")),
      headId: (form.get("headId") as string) || null,
      parentId: (form.get("parentId") as string) || null,
      ...(editing ? { status: form.get("status") as string } : {}),
    };
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/api/v1/departments/${editing.id}`, payload);
        toast.success(`Department "${payload.name}" updated`);
      } else {
        await api.post("/api/v1/departments", payload);
        toast.success(`Department "${payload.name}" created`);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(d: Dept) {
    const next = d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.patch(`/api/v1/departments/${d.id}`, { status: next });
      toast.success(`"${d.name}" is now ${next.toLowerCase()}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>New Department</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Head</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead className="text-right">Members</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell>{d.head?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{d.parent?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right tabular-nums">{d.members}</TableCell>
                <TableCell>
                  <Badge variant={d.status === "ACTIVE" ? "secondary" : "outline"}>
                    {d.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button size="xs" variant="outline" onClick={() => openEdit(d)}>Edit</Button>
                  <Button size="xs" variant="ghost" onClick={() => toggleStatus(d)}>
                    {d.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {departments.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No departments yet — create the first one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "New Department"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update department details" : "Add a department to the organization"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name</Label>
              <Input id="dept-name" name="name" defaultValue={editing?.name} required minLength={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-head">Department Head</Label>
              <NativeSelect id="dept-head" name="headId" defaultValue={editing?.head?.id ?? ""}>
                <option value="">— none —</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-parent">Parent Department (optional)</Label>
              <NativeSelect id="dept-parent" name="parentId" defaultValue={editing?.parent?.id ?? ""}>
                <option value="">— none —</option>
                {departments
                  .filter((d) => d.id !== editing?.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </NativeSelect>
            </div>
            {editing && (
              <div className="space-y-2">
                <Label htmlFor="dept-status">Status</Label>
                <NativeSelect id="dept-status" name="status" defaultValue={editing.status}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </NativeSelect>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
