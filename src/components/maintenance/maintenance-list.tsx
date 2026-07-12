import Link from "next/link";
import { MaintenancePriority, MaintenanceStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MaintenancePriorityBadge } from "./maintenance-priority-badge";
import { MaintenanceActions } from "./maintenance-actions";

export type MaintenanceRow = {
  id: string;
  title: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  technicianName: string | null;
  rejectionReason: string | null;
  createdAt: string;
  asset: { id: string; assetTag: string; name: string };
  raisedBy: { id: string; name: string };
};

const STATUS_VARIANT: Record<MaintenanceStatus, "secondary" | "outline" | "destructive" | "default"> = {
  PENDING: "secondary",
  APPROVED: "default",
  ASSIGNED: "default",
  IN_PROGRESS: "default",
  RESOLVED: "outline",
  REJECTED: "destructive",
};

export function MaintenanceList({
  requests,
  canApprove,
  canProgress,
}: {
  requests: MaintenanceRow[];
  canApprove: boolean;
  canProgress: boolean;
}) {
  const showActions = canApprove || canProgress;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead>Issue</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Raised By</TableHead>
            <TableHead>Technician</TableHead>
            {showActions && <TableHead className="w-40" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                <Link href={`/assets/${r.asset.id}`} className="hover:underline">{r.asset.assetTag}</Link>
                <span className="block text-xs text-muted-foreground">{r.asset.name}</span>
              </TableCell>
              <TableCell className="max-w-56 truncate">{r.title}</TableCell>
              <TableCell><MaintenancePriorityBadge priority={r.priority} /></TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status]}>{r.status.replace("_", " ")}</Badge>
                {r.status === "REJECTED" && r.rejectionReason && (
                  <span className="block text-xs text-muted-foreground">{r.rejectionReason}</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{r.raisedBy.name}</TableCell>
              <TableCell className="text-muted-foreground">{r.technicianName ?? "—"}</TableCell>
              {showActions && (
                <TableCell>
                  <MaintenanceActions request={r} canApprove={canApprove} canProgress={canProgress} />
                </TableCell>
              )}
            </TableRow>
          ))}
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="py-10 text-center text-muted-foreground">
                No maintenance requests match this filter.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
