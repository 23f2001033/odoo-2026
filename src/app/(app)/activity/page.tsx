import { auth } from "@/auth";
import { normalizeSessionUser } from "@/lib/authz";
import { listNotifications } from "@/modules/notification/service";
import { listActivityLog } from "@/modules/activity/service";
import { activitySearchSchema } from "@/modules/activity/validators";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { NotificationsTab, NotificationRow } from "@/components/notifications/notifications-tab";
import { ActivityFilters } from "@/components/activity/activity-filters";

export const metadata = { title: "Activity" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const session = await auth();
  const user = normalizeSessionUser(session!.user);

  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const filters = activitySearchSchema.parse({
    entityType: one(sp.entityType) || undefined,
    action: one(sp.action) || undefined,
  });
  const defaultTab = one(sp.tab) === "log" ? "log" : "notifications";

  const [notifications, activity] = await Promise.all([
    listNotifications(user.id, {}),
    listActivityLog(user, filters),
  ]);

  const notificationRows: NotificationRow[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">Notifications and the full audit trail — who did what, when</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="log">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="pt-4">
          <NotificationsTab initial={notificationRows} />
        </TabsContent>

        <TabsContent value="log" className="space-y-4 pt-4">
          <ActivityFilters entityType={filters.entityType ?? ""} action={filters.action ?? ""} />
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.createdAt.toLocaleString()}
                    </TableCell>
                    <TableCell>{a.actor.name}</TableCell>
                    <TableCell className="font-mono text-xs">{a.action}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.entityType} <span className="text-xs">({a.entityId.slice(0, 8)})</span>
                    </TableCell>
                  </TableRow>
                ))}
                {activity.items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No activity matches this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {activity.total > activity.pageSize && (
            <p className="text-xs text-muted-foreground">
              Showing {activity.items.length} of {activity.total}
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
