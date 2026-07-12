import Link from "next/link";
import { auth } from "@/auth";
import { hasPermission, normalizeSessionUser } from "@/lib/authz";
import { listAllocations, listTransferRequests } from "@/modules/allocation/service";
import { searchAssets } from "@/modules/asset/service";
import { listDepartments, listEmployees } from "@/modules/org/service";
import { allocationSearchSchema } from "@/modules/allocation/validators";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AllocationFilters } from "@/components/allocations/allocation-filters";
import { NewAllocationDialog } from "@/components/allocations/new-allocation-dialog";
import { TransferRequestsTab, TransferRow } from "@/components/allocations/transfer-requests-tab";

export const metadata = { title: "Allocations & Transfers" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AllocationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const user = normalizeSessionUser(session!.user);

  const statusParam = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const filters = allocationSearchSchema.parse({ status: statusParam || undefined });

  const canAllocate = hasPermission(user, "asset.allocate");
  const canApproveTransfer = hasPermission(user, "transfer.approve");

  const [allocations, transfers, availableAssetsResult, employees, departments] = await Promise.all([
    listAllocations(user, filters),
    listTransferRequests(user),
    canAllocate
      ? searchAssets({ status: "AVAILABLE", page: 1, pageSize: 100 })
      : Promise.resolve({ items: [], total: 0, page: 1, pageSize: 100 }),
    listEmployees(),
    listDepartments(),
  ]);

  const employeeOptions = employees.filter((e) => e.status === "ACTIVE").map((e) => ({ id: e.id, name: e.name }));
  const departmentOptions = departments.filter((d) => d.status === "ACTIVE").map((d) => ({ id: d.id, name: d.name }));

  const transferRows: TransferRow[] = transfers.map((t) => ({
    id: t.id,
    status: t.status,
    reason: t.reason,
    decisionNote: t.decisionNote,
    createdAt: t.createdAt.toISOString(),
    asset: t.asset,
    requestedBy: t.requestedBy,
    targetUser: t.targetUser,
    targetDept: t.targetDept,
    decidedBy: t.decidedBy,
  }));

  const pendingCount = transfers.filter((t) => t.status === "REQUESTED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Allocations & Transfers</h1>
        <p className="text-sm text-muted-foreground">
          Who holds what, overdue returns, and transfer approvals
        </p>
      </div>

      <Tabs defaultValue="allocations">
        <TabsList>
          <TabsTrigger value="allocations">Allocations</TabsTrigger>
          <TabsTrigger value="transfers">
            Transfer Requests{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="allocations" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <AllocationFilters status={filters.status ?? ""} />
            {canAllocate && (
              <NewAllocationDialog
                availableAssets={availableAssetsResult.items.map((a) => ({ id: a.id, assetTag: a.assetTag, name: a.name }))}
                employees={employeeOptions}
                departments={departmentOptions}
              />
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Holder</TableHead>
                  <TableHead>Allocated By</TableHead>
                  <TableHead>Allocated</TableHead>
                  <TableHead>Expected Return</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <Link href={`/assets/${a.asset.id}`} className="hover:underline">
                        {a.asset.assetTag}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{a.asset.name}</span>
                    </TableCell>
                    <TableCell>{a.holderUser?.name ?? a.holderDept?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{a.allocatedBy.name}</TableCell>
                    <TableCell className="text-muted-foreground">{a.allocatedAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.expectedReturnAt?.toLocaleDateString() ?? "—"}
                    </TableCell>
                    <TableCell className="space-x-1.5">
                      <Badge variant={a.status === "ACTIVE" ? "secondary" : "outline"}>
                        {a.status === "ACTIVE" ? "Active" : "Returned"}
                      </Badge>
                      {a.overdue && <Badge variant="destructive">Overdue</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
                {allocations.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      No allocations match this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="transfers" className="pt-4">
          <TransferRequestsTab transfers={transferRows} canApprove={canApproveTransfer} currentUserId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
