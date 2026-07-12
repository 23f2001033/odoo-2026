"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Role } from "@prisma/client";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Employee = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  department: { id: string; name: string } | null;
};

type Props = {
  employees: Employee[];
  departmentOptions: { id: string; name: string }[];
  currentUserId: string;
};

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  ASSET_MANAGER: "Asset Manager",
  DEPT_HEAD: "Department Head",
  EMPLOYEE: "Employee",
};

const ROLE_BADGE: Record<Role, "default" | "secondary" | "outline"> = {
  ADMIN: "default",
  ASSET_MANAGER: "default",
  DEPT_HEAD: "secondary",
  EMPLOYEE: "outline",
};

export function EmployeesTab({ employees, departmentOptions, currentUserId }: Props) {
  const router = useRouter();
  const [managing, setManaging] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!managing) return;
    const form = new FormData(e.currentTarget);
    const role = form.get("role") as Role;
    const departmentId = (form.get("departmentId") as string) || null;
    const status = form.get("status") as "ACTIVE" | "INACTIVE";

    setSaving(true);
    try {
      // Role changes go through the dedicated endpoint — the only path that
      // can grant roles (spec: no self-assigned roles).
      if (role !== managing.role) {
        await api.patch(`/api/v1/users/${managing.id}/role`, { role });
      }
      if (departmentId !== (managing.department?.id ?? null) || status !== managing.status) {
        await api.patch(`/api/v1/users/${managing.id}`, { departmentId, status });
      }
      toast.success(`${managing.name} updated`);
      setManaging(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Signup always creates an <strong>Employee</strong> account — this directory is the only
        place roles are granted.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">
                  {emp.name}
                  {emp.id === currentUserId && (
                    <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                <TableCell>{emp.department?.name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE[emp.role]}>{ROLE_LABEL[emp.role]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={emp.status === "ACTIVE" ? "secondary" : "outline"}>
                    {emp.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="xs" variant="outline" onClick={() => setManaging(emp)}>
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!managing} onOpenChange={(o) => !o && setManaging(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {managing?.name}</DialogTitle>
            <DialogDescription>{managing?.email}</DialogDescription>
          </DialogHeader>
          {managing && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emp-role">Role</Label>
                <NativeSelect
                  id="emp-role"
                  name="role"
                  defaultValue={managing.role}
                  disabled={managing.id === currentUserId}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="DEPT_HEAD">Department Head</option>
                  <option value="ASSET_MANAGER">Asset Manager</option>
                  <option value="ADMIN">Admin</option>
                </NativeSelect>
                {managing.id === currentUserId && (
                  <p className="text-xs text-muted-foreground">You cannot change your own role.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-dept">Department</Label>
                <NativeSelect id="emp-dept" name="departmentId" defaultValue={managing.department?.id ?? ""}>
                  <option value="">— none —</option>
                  {departmentOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-status">Status</Label>
                <NativeSelect
                  id="emp-status"
                  name="status"
                  defaultValue={managing.status}
                  disabled={managing.id === currentUserId}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </NativeSelect>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setManaging(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
