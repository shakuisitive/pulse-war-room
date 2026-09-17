"use client";

import Link from "next/link";
import { useTransition } from "react";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import type { Database } from "@/types/supabase";
import { Bell } from "lucide-react";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export function NotificationCenter({
  userId,
  orgId,
  initialNotifications,
}: {
  userId: string;
  orgId: string;
  initialNotifications: Notification[];
}) {
  const [isPending, startTransition] = useTransition();
  const { notifications, unreadCount } = useRealtimeNotifications(
    userId,
    orgId,
    initialNotifications,
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {unreadCount > 0 ? (
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await markAllNotificationsReadAction();
                });
              }}
            >
              Mark all read
            </Button>
          ) : null}

          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-md border border-border p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    {notification.body ? (
                      <p className="mt-1 text-muted-foreground">{notification.body}</p>
                    ) : null}
                    {notification.incident_id ? (
                      <Link
                        href={`/incidents/${notification.incident_id}`}
                        className="mt-2 inline-block text-primary hover:underline"
                      >
                        View incident
                      </Link>
                    ) : null}
                  </div>
                  {!notification.is_read ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          await markNotificationReadAction(notification.id);
                        });
                      }}
                    >
                      Read
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
