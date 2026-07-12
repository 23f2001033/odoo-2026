import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission } from "@/lib/authz";
import { listCategories } from "@/modules/org/service";
import { listLocations } from "@/modules/asset/service";
import { AssetRegisterForm } from "@/components/assets/asset-register-form";
import type { FieldDef } from "@/components/org/categories-tab";

export const metadata = { title: "Register Asset" };

export default async function RegisterAssetPage() {
  const session = await auth();
  if (!hasPermission(session!.user, "asset.register")) redirect("/assets");

  const [categories, locationRows] = await Promise.all([listCategories(), listLocations()]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Register Asset</h1>
        <p className="text-sm text-muted-foreground">
          New assets enter the system as <strong>Available</strong> with an auto-generated tag
          and QR code.
        </p>
      </div>

      <AssetRegisterForm
        categories={categories.map((c) => ({ id: c.id, name: c.name, fieldDefs: (c.fieldDefs as FieldDef[]) ?? [] }))}
        locations={locationRows.map((l) => l.location).filter(Boolean)}
      />
    </div>
  );
}
