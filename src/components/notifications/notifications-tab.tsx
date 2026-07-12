"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationType } from "@prisma/client";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export function NotificationsTab({ initial }: { initial: NotificationRow[] }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initial);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function onMarkRead(id: string) {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    await api.post(`/api/v1/notifications/${id}/read`);
    router.refresh();
  }

  async function onMarkAllRead() {
    setNotifications((list) => list.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    await api.post("/api/v1/notifications/read-all");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
        </p>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={onMarkAllRead}>Mark all read</Button>
        )}
      </div>

      <div className="divide-y rounded-lg border">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`flex items-start justify-between gap-3 px-4 py-3 ${n.readAt ? "" : "bg-primary/5"}`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {!n.readAt && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                <span className="text-sm font-medium">{n.title}</span>
                <Badge variant="outline" className="text-[10px]">{n.type.replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            {!n.readAt && (
              <Button size="xs" variant="ghost" onClick={() => onMarkRead(n.id)}>Mark read</Button>
            )}
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
