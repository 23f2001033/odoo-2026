import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission, normalizeSessionUser } from "@/lib/authz";
import { getAuditCycleDetail } from "@/modules/audit/service";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AuditItemsPanel } from "@/components/audits/audit-items-panel";
import { CloseCycleButton } from "@/components/audits/close-cycle-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Audit — ${id}` };
}

export default async function AuditCycleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = normalizeSessionUser(session!.user);

  let cycle;
  try {
    cycle = await getAuditCycleDetail(user, id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    if (err instanceof ForbiddenError) notFound(); // don't leak existence to unauthorized users
    throw err;
  }

  const canManage = hasPermission(user, "audit.cycle.manage");
  const isAssignedAuditor = cycle.assignments.some((a) => a.auditor.id === user.id);
  const canCheck = cycle.status === "OPEN" && (canManage || isAssignedAuditor);

  const missing = cycle.items.filter((i) => i.result === "MISSING");
  const damaged = cycle.items.filter((i) => i.result === "DAMAGED");
  const unchecked = cycle.items.filter((i) => i.result === "PENDING");

  const items = cycle.items.map((i) => ({
    id: i.id,
    result: i.result,
    notes: i.notes,
    checkedAt: i.checkedAt?.toISOString() ?? null,
    checkedBy: i.checkedBy,
    asset: i.asset,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{cycle.name}</h1>
            <Badge variant={cycle.status === "OPEN" ? "secondary" : "outline"}>{cycle.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {cycle.scopeDept?.name ?? cycle.scopeLocation ?? "Org-wide"} ·{" "}
            {cycle.startsAt.toLocaleDateString()} – {cycle.endsAt.toLocaleDateString()} · created by{" "}
            {cycle.createdBy.name}
          </p>
        </div>
        {canManage && cycle.status === "OPEN" && (
          <CloseCycleButton cycleId={cycle.id} uncheckedCount={unchecked.length} />
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-muted-foreground">
          Auditors: <span className="text-foreground">{cycle.assignments.map((a) => a.auditor.name).join(", ")}</span>
        </span>
      </div>

      {(missing.length > 0 || damaged.length > 0) && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="space-y-2 pt-6">
            <p className="text-sm font-semibold text-destructive">
              Discrepancy Report — {missing.length} missing, {damaged.length} damaged
            </p>
            <ul className="space-y-1 text-sm">
              {[...missing, ...damaged].map((i) => (
                <li key={i.id} className="flex items-center gap-2">
                  <Badge variant={i.result === "MISSING" ? "destructive" : "outline"}>{i.result}</Badge>
                  <span className="font-medium">{i.asset.assetTag}</span>
                  <span className="text-muted-foreground">{i.asset.name}</span>
                  {i.notes && <span className="text-muted-foreground">— {i.notes}</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <AuditItemsPanel cycleId={cycle.id} items={items} canCheck={canCheck} />
    </div>
  );
}
