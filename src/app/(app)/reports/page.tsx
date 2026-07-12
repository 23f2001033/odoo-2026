import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission, normalizeSessionUser } from "@/lib/authz";
import {
  getAttentionReport,
  getBookingHeatmap,
  getDepartmentAllocationSummary,
  getMaintenanceFrequencyReport,
  getUtilizationReport,
} from "@/modules/report/service";
import { PeriodFilter } from "@/components/reports/period-filter";
import { ReportCard } from "@/components/reports/report-card";
import { BarChart } from "@/components/reports/bar-chart";
import { BookingHeatmapChart } from "@/components/reports/booking-heatmap-chart";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Reports & Analytics" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const session = await auth();
  const user = normalizeSessionUser(session!.user);
  if (!hasPermission(user, "report.orgWide")) redirect("/dashboard");

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const periodDays = Number(one(sp.periodDays) ?? "30") || 30;
  const q = `periodDays=${periodDays}`;

  const [utilization, maintenance, attention, deptAllocation, heatmap] = await Promise.all([
    getUtilizationReport(periodDays),
    getMaintenanceFrequencyReport(periodDays),
    getAttentionReport(),
    getDepartmentAllocationSummary(),
    getBookingHeatmap(periodDays),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Actionable operational insight, computed from live data</p>
        </div>
        <PeriodFilter periodDays={periodDays} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard
          title="Asset Utilization"
          description={`Hours in use (allocated or booked) over the last ${periodDays} days`}
          exportHref={`/api/v1/reports/utilization?${q}&format=csv`}
        >
          <BarChart
            unit="hrs"
            data={utilization.mostUsed.map((a) => ({ label: a.assetTag, sublabel: a.name, value: a.hours }))}
          />
          {utilization.idle.length > 0 && (
            <div className="mt-5 border-t pt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Idle — no allocation or booking activity this period ({utilization.idle.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {utilization.idle.slice(0, 20).map((a) => (
                  <Badge key={a.id} variant="outline">{a.assetTag}</Badge>
                ))}
                {utilization.idle.length > 20 && (
                  <span className="text-xs text-muted-foreground">+{utilization.idle.length - 20} more</span>
                )}
              </div>
            </div>
          )}
        </ReportCard>

        <ReportCard
          title="Maintenance Frequency"
          description={`Requests by category, last ${periodDays} days`}
          exportHref={`/api/v1/reports/maintenance-frequency?${q}&format=csv`}
        >
          <BarChart
            unit="requests"
            data={maintenance.byCategory.map((c) => ({ label: c.name, value: c.count }))}
          />
        </ReportCard>

        <ReportCard
          title="Department-wise Allocation"
          description="Active allocations by department, right now"
          exportHref="/api/v1/reports/dept-allocation?format=csv"
        >
          <BarChart
            unit="assets"
            data={deptAllocation.byDepartment.map((d) => ({ label: d.name, value: d.count }))}
          />
        </ReportCard>

        <ReportCard
          title="Resource Booking Heatmap"
          description={`Peak usage windows across all bookable resources, last ${periodDays} days`}
          exportHref={`/api/v1/reports/booking-heatmap?${q}&format=csv`}
        >
          <BookingHeatmapChart grid={heatmap.grid} />
        </ReportCard>
      </div>

      <ReportCard
        title="Assets Needing Attention"
        description="Frequent repairs recently, or an old acquisition date — nearing end of life"
        exportHref="/api/v1/reports/attention?format=csv"
      >
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Reasons</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attention.map((a) => (
                <TableRow key={a.assetTag}>
                  <TableCell className="font-medium">
                    {a.assetTag}
                    <span className="block text-xs font-normal text-muted-foreground">{a.name}</span>
                  </TableCell>
                  <TableCell className="space-x-1.5">
                    {a.reasons.map((r) => (
                      <Badge key={r} variant="outline">{r}</Badge>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
              {attention.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                    Nothing flagged — no old assets or frequent repairs.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </ReportCard>

      {maintenance.topAssets.length > 0 && (
        <ReportCard title="Most-Repaired Assets" description={`Top individual assets by repair count, last ${periodDays} days`}>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.topAssets.map((a) => (
                  <TableRow key={a.assetTag}>
                    <TableCell className="font-medium">
                      {a.assetTag}
                      <span className="ml-2 font-normal text-muted-foreground">{a.name}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{a.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ReportCard>
      )}
    </div>
  );
}
