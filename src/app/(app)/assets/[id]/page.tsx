import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import {
  getAssetAllocationHistory,
  getAssetById,
  getAssetMaintenanceHistory,
  listLocations,
} from "@/modules/asset/service";
import { NotFoundError } from "@/lib/errors";
import { hasPermission } from "@/lib/authz";
import { canTransition, assetMachine } from "@/lib/stateMachine";
import { assetQrUrl, generateQrDataUrl } from "@/lib/qr";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { AssetDetailActions } from "@/components/assets/asset-detail-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { FieldDef } from "@/components/org/categories-tab";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const asset = await getAssetById(id);
    return { title: asset.assetTag };
  } catch {
    return { title: "Asset" };
  }
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user;

  let asset;
  try {
    asset = await getAssetById(id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const [allocations, maintenance, locationRows, qrDataUrl] = await Promise.all([
    getAssetAllocationHistory(id),
    getAssetMaintenanceHistory(id),
    listLocations(),
    generateQrDataUrl(assetQrUrl(asset.assetTag)),
  ]);

  const fieldDefs = (asset.category.fieldDefs as unknown as FieldDef[]) ?? [];
  const attributes = (asset.attributes as Record<string, string | number>) ?? {};
  const canEdit = hasPermission(user, "asset.update");
  const canRetire = canEdit && canTransition(assetMachine, asset.status, "RETIRED");
  const canDispose = canEdit && canTransition(assetMachine, asset.status, "DISPOSED");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-2xl font-bold tracking-tight">{asset.assetTag}</h1>
            <AssetStatusBadge status={asset.status} />
            {asset.isBookable && <Badge variant="outline">Bookable</Badge>}
          </div>
          <p className="mt-1 text-lg">{asset.name}</p>
          <p className="text-sm text-muted-foreground">
            {asset.category.name} · registered by {asset.createdBy.name}
          </p>
        </div>
        {canEdit && (
          <AssetDetailActions
            asset={{
              id: asset.id,
              name: asset.name,
              serialNumber: asset.serialNumber,
              acquisitionDate: asset.acquisitionDate?.toISOString().slice(0, 10) ?? null,
              acquisitionCost: asset.acquisitionCost ? Number(asset.acquisitionCost) : null,
              condition: asset.condition,
              location: asset.location,
              isBookable: asset.isBookable,
              photoUrl: asset.photoUrl,
              attributes,
            }}
            fieldDefs={fieldDefs}
            locations={locationRows.map((l) => l.location).filter(Boolean)}
            canRetire={canRetire}
            canDispose={canDispose}
          />
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 pt-6 sm:grid-cols-3">
            <Detail label="Serial Number" value={asset.serialNumber} />
            <Detail label="Condition" value={asset.condition} />
            <Detail label="Location" value={asset.location} />
            <Detail
              label="Acquisition Date"
              value={asset.acquisitionDate?.toLocaleDateString()}
            />
            <Detail
              label="Acquisition Cost"
              value={asset.acquisitionCost ? `₹${Number(asset.acquisitionCost).toLocaleString()}` : null}
            />
            <Detail label="Bookable" value={asset.isBookable ? "Yes" : "No"} />
            {fieldDefs.map((f) => (
              <Detail key={f.key} label={f.label} value={attributes[f.key] != null ? String(attributes[f.key]) : null} />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center gap-2 pt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR code for ${asset.assetTag}`} className="size-40" />
            <p className="text-xs text-muted-foreground">Scan to open this asset</p>
            {asset.photoUrl && (
              <Image
                src={asset.photoUrl}
                alt={asset.name}
                width={160}
                height={160}
                className="mt-2 rounded border object-cover"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Allocation History</h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holder</TableHead>
                <TableHead>Allocated By</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Expected Return</TableHead>
                <TableHead>Returned</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.holderUser?.name ?? a.holderDept?.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{a.allocatedBy.name}</TableCell>
                  <TableCell className="text-muted-foreground">{a.allocatedAt.toLocaleDateString()}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.expectedReturnAt?.toLocaleDateString() ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.returnedAt?.toLocaleDateString() ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.status === "ACTIVE" ? "secondary" : "outline"}>
                      {a.status === "ACTIVE" ? "Active" : "Returned"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {allocations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No allocation history yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Maintenance History</h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Raised By</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Raised</TableHead>
                <TableHead>Resolved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {maintenance.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.title}</TableCell>
                  <TableCell className="text-muted-foreground">{m.raisedBy.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.priority}</TableCell>
                  <TableCell><Badge variant="outline">{m.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{m.createdAt.toLocaleDateString()}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.resolvedAt?.toLocaleDateString() ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {maintenance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    No maintenance history yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}
