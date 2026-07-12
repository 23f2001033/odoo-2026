import { auth } from "@/auth";
import { hasPermission, normalizeSessionUser } from "@/lib/authz";
import { listMaintenanceRequests } from "@/modules/maintenance/service";
import { searchAssets } from "@/modules/asset/service";
import { maintenanceSearchSchema } from "@/modules/maintenance/validators";
import { MaintenanceFilters } from "@/components/maintenance/maintenance-filters";
import { RaiseMaintenanceDialog } from "@/components/maintenance/raise-maintenance-dialog";
import { MaintenanceList, MaintenanceRow } from "@/components/maintenance/maintenance-list";

export const metadata = { title: "Maintenance" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function MaintenancePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const session = await auth();
  const user = normalizeSessionUser(session!.user);

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filters = maintenanceSearchSchema.parse({
    status: one(sp.status) || undefined,
    priority: one(sp.priority) || undefined,
  });

  const [requests, assetsResult] = await Promise.all([
    listMaintenanceRequests(user, filters),
    searchAssets({ page: 1, pageSize: 200 }),
  ]);

  // Retired/disposed/lost assets can't have a new ticket raised against them
  // (service-enforced too — this just keeps the picker from offering them).
  const raisableAssets = assetsResult.items
    .filter((a) => !["RETIRED", "DISPOSED", "LOST"].includes(a.status))
    .map((a) => ({ id: a.id, assetTag: a.assetTag, name: a.name }));

  const rows: MaintenanceRow[] = requests.map((r) => ({
    id: r.id,
    title: r.title,
    priority: r.priority,
    status: r.status,
    technicianName: r.technicianName,
    rejectionReason: r.rejectionReason,
    createdAt: r.createdAt.toISOString(),
    asset: r.asset,
    raisedBy: r.raisedBy,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Repairs route through approval before work starts</p>
        </div>
        <RaiseMaintenanceDialog assets={raisableAssets} />
      </div>

      <MaintenanceFilters status={filters.status ?? ""} priority={filters.priority ?? ""} />

      <MaintenanceList
        requests={rows}
        canApprove={hasPermission(user, "maintenance.approve")}
        canProgress={hasPermission(user, "maintenance.progress")}
      />
    </div>
  );
}
