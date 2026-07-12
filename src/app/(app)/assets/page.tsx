import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { searchAssets, listLocations } from "@/modules/asset/service";
import { listCategories, listDepartments } from "@/modules/org/service";
import { assetSearchSchema } from "@/modules/asset/validators";
import { hasPermission } from "@/lib/authz";
import { Button } from "@/components/ui/button";
import { AssetStatusBadge } from "@/components/assets/asset-status-badge";
import { AssetFilters, AssetFiltersValue } from "@/components/assets/asset-filters";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Package } from "lucide-react";

export const metadata = { title: "Assets" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AssetDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const user = session!.user;

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const filters = assetSearchSchema.parse({
    q: one(sp.q) || undefined,
    categoryId: one(sp.categoryId) || undefined,
    status: one(sp.status) || undefined,
    departmentId: one(sp.departmentId) || undefined,
    location: one(sp.location) || undefined,
    bookable: one(sp.bookable) === "true" ? true : undefined,
    page: one(sp.page) || undefined,
  });

  const [result, categories, departments, locationRows] = await Promise.all([
    searchAssets(filters),
    listCategories(),
    listDepartments(),
    listLocations(),
  ]);

  const filterValue: AssetFiltersValue = {
    q: filters.q ?? "",
    categoryId: filters.categoryId ?? "",
    status: filters.status ?? "",
    departmentId: filters.departmentId ?? "",
    location: filters.location ?? "",
    bookable: filters.bookable ?? false,
  };

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.status) params.set("status", filters.status);
    if (filters.departmentId) params.set("departmentId", filters.departmentId);
    if (filters.location) params.set("location", filters.location);
    if (filters.bookable) params.set("bookable", "true");
    params.set("page", String(p));
    return `/assets?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} asset{result.total === 1 ? "" : "s"} · search, filter, or scan a QR
            code to jump straight to one
          </p>
        </div>
        {hasPermission(user, "asset.register") && (
          <Button size="sm" render={<Link href="/assets/register" />}>Register Asset</Button>
        )}
      </div>

      <AssetFilters
        initial={filterValue}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        departments={departments.filter((d) => d.status === "ACTIVE").map((d) => ({ id: d.id, name: d.name }))}
        locations={locationRows.map((l) => l.location).filter(Boolean)}
      />

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12" />
              <TableHead>Asset Tag</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Condition</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((asset) => (
              // Note: <tr> cannot legally render as <a> (invalid table nesting),
              // so the tag/name cells carry the link instead of the whole row.
              <TableRow key={asset.id} className="hover:bg-muted/50">
                <TableCell>
                  {asset.photoUrl ? (
                    <Image src={asset.photoUrl} alt="" width={32} height={32} className="rounded object-cover" />
                  ) : (
                    <div className="flex size-8 items-center justify-center rounded bg-muted text-muted-foreground">
                      <Package className="size-4" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono font-medium">
                  <Link href={`/assets/${asset.id}`} className="hover:underline">
                    {asset.assetTag}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/assets/${asset.id}`} className="hover:underline">
                    {asset.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{asset.category.name}</TableCell>
                <TableCell><AssetStatusBadge status={asset.status} /></TableCell>
                <TableCell className="text-muted-foreground">{asset.location ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{asset.condition}</TableCell>
              </TableRow>
            ))}
            {result.items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No assets match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {filters.page} of {totalPages}</span>
          <div className="flex gap-2">
            {filters.page > 1 ? (
              <Button size="sm" variant="outline" render={<Link href={pageHref(filters.page - 1)} />}>
                Previous
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>Previous</Button>
            )}
            {filters.page < totalPages ? (
              <Button size="sm" variant="outline" render={<Link href={pageHref(filters.page + 1)} />}>
                Next
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>Next</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
