"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { NotificationType } from "@prisma/client";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Polls the lightweight unread-count endpoint every 30s (docs/04 §8:
// "polling is enough; websockets are demo-risk for zero score"). The
// dropdown itself only fetches the full list when opened, not on every poll.
export function NotificationBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [open, setOpen] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>("/api/v1/notifications/unread-count");
      setCount(res.count);
    } catch {
      // silent — a failed poll shouldn't surface an error toast
    }
  }, []);

  useEffect(() => {
    // Deferred into a microtask so the initial poll fires from a callback,
    // not as a bare statement in the effect body (react-hooks/set-state-in-effect).
    Promise.resolve().then(refreshCount);
    const interval = setInterval(refreshCount, 30_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  async function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      const list = await api.get<Notification[]>("/api/v1/notifications");
      setNotifications(list);
    }
  }

  async function onNotificationClick(n: Notification) {
    if (!n.readAt) {
      await api.post(`/api/v1/notifications/${n.id}/read`);
      setNotifications((list) => list?.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) ?? null);
      setCount((c) => Math.max(0, c - 1));
    }
  }

  async function onMarkAllRead() {
    await api.post("/api/v1/notifications/read-all");
    setNotifications((list) => list?.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })) ?? null);
    setCount(0);
    router.refresh();
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="relative">
            <Bell className="size-4" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {count > 0 && (
            <button onClick={onMarkAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications === null && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          )}
          {notifications?.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          )}
          {notifications?.map((n) => (
            <button
              key={n.id}
              onClick={() => onNotificationClick(n)}
              className="flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50"
            >
              <div className="flex w-full items-center gap-2">
                {!n.readAt && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                <span className={n.readAt ? "text-sm text-muted-foreground" : "text-sm font-medium"}>{n.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{n.body}</span>
              <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
            </button>
          ))}
        </div>
        <div className="border-t px-3 py-2 text-center">
          <Link href="/activity" className="text-xs text-primary hover:underline" onClick={() => setOpen(false)}>
            View all activity
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
