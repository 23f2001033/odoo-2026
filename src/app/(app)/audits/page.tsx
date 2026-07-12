import Link from "next/link";
import { auth } from "@/auth";
import { hasPermission, normalizeSessionUser } from "@/lib/authz";
import { listAuditCycles } from "@/modules/audit/service";
import { listDepartments, listEmployees } from "@/modules/org/service";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { NewAuditCycleDialog } from "@/components/audits/new-audit-cycle-dialog";

export const metadata = { title: "Asset Audits" };

export default async function AuditsPage() {
  const session = await auth();
  const user = normalizeSessionUser(session!.user);
  const canManage = hasPermission(user, "audit.cycle.manage");

  const [cycles, departments, employees] = await Promise.all([
    listAuditCycles(user),
    canManage ? listDepartments() : Promise.resolve([]),
    canManage ? listEmployees() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Asset Audits</h1>
          <p className="text-sm text-muted-foreground">Structured verification cycles with auto-generated discrepancy reports</p>
        </div>
        {canManage && (
          <NewAuditCycleDialog
            departments={departments.filter((d) => d.status === "ACTIVE").map((d) => ({ id: d.id, name: d.name }))}
            users={employees.filter((e) => e.status === "ACTIVE").map((e) => ({ id: e.id, name: e.name }))}
          />
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead>Auditors</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cycles.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link href={`/audits/${c.id}`} className="hover:underline">{c.name}</Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.scopeDept?.name ?? c.scopeLocation ?? "Org-wide"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.startsAt.toLocaleDateString()} – {c.endsAt.toLocaleDateString()}
                </TableCell>
                <TableCell className="text-muted-foreground">{c._count.items}</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.assignments.map((a) => a.auditor.name).join(", ")}
                </TableCell>
                <TableCell>
                  <Badge variant={c.status === "OPEN" ? "secondary" : "outline"}>{c.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {cycles.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No audit cycles {canManage ? "yet." : "assigned to you yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
