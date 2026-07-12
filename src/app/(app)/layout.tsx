import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notifications/notification-bell";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  ASSET_MANAGER: "Asset Manager",
  DEPT_HEAD: "Department Head",
  EMPLOYEE: "Employee",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login"); // belt-and-suspenders with middleware

  const { name, role } = session.user;

  return (
    <div className="flex min-h-screen">
      <AppSidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <MobileNav role={role} />
            <Link href="/dashboard" className="text-lg font-bold">
              Asset<span className="text-primary">Flow</span>
            </Link>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Badge variant="secondary">{ROLE_LABEL[role] ?? role}</Badge>
            <span className="text-sm font-medium">{name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <Button variant="outline" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
