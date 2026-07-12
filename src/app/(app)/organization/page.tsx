import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listCategories, listDepartments, listEmployees } from "@/modules/org/service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartmentsTab } from "@/components/org/departments-tab";
import { CategoriesTab } from "@/components/org/categories-tab";
import { EmployeesTab } from "@/components/org/employees-tab";
import type { FieldDef } from "@/components/org/categories-tab";

export const metadata = { title: "Organization Setup" };

// Admin-only screen (spec §3) — reads call services directly (no HTTP hop),
// mutations go through /api/v1/* from the client tabs.
export default async function OrganizationPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/dashboard");

  const [departments, categories, employees] = await Promise.all([
    listDepartments(),
    listCategories(),
    listEmployees(),
  ]);

  const deptDtos = departments.map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    head: d.head,
    parent: d.parent,
    members: d._count.members,
  }));

  const categoryDtos = categories.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    fieldDefs: (c.fieldDefs as FieldDef[]) ?? [],
    assets: c._count.assets,
  }));

  const employeeDtos = employees.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.role,
    status: e.status,
    department: e.department,
  }));

  const userOptions = employeeDtos
    .filter((e) => e.status === "ACTIVE")
    .map((e) => ({ id: e.id, name: e.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization Setup</h1>
        <p className="text-sm text-muted-foreground">
          Master data everything else depends on — departments, asset categories, and the
          employee directory
        </p>
      </div>

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="categories">Asset Categories</TabsTrigger>
          <TabsTrigger value="employees">Employee Directory</TabsTrigger>
        </TabsList>
        <TabsContent value="departments" className="pt-4">
          <DepartmentsTab departments={deptDtos} userOptions={userOptions} />
        </TabsContent>
        <TabsContent value="categories" className="pt-4">
          <CategoriesTab categories={categoryDtos} />
        </TabsContent>
        <TabsContent value="employees" className="pt-4">
          <EmployeesTab
            employees={employeeDtos}
            departmentOptions={deptDtos
              .filter((d) => d.status === "ACTIVE")
              .map((d) => ({ id: d.id, name: d.name }))}
            currentUserId={session.user.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
