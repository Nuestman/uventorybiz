import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMarkAllPortalNotificationsRead,
  useMarkPortalNotificationRead,
  usePortalNotifications,
  usePortalNotificationsUnreadCount,
} from "./usePortalNotifications";

type Props = {
  enabled?: boolean;
  primaryColor?: string;
};

export default function PortalNotificationsMenu({ enabled = true, primaryColor }: Props) {
  const { data: notifications } = usePortalNotifications(enabled);
  const { data: unread } = usePortalNotificationsUnreadCount(enabled);
  const markRead = useMarkPortalNotificationRead();
  const markAllRead = useMarkAllPortalNotificationsRead();

  const unreadCount = unread?.count ?? 0;

  if (!enabled) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1 text-[10px]"
              style={primaryColor ? { backgroundColor: primaryColor } : undefined}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Notifications</span>
          {unreadCount > 0 ? (
            <button
              type="button"
              className="text-xs font-normal text-[var(--portal-teal)] hover:underline"
              disabled={markAllRead.isPending}
              onClick={() => markAllRead.mutate()}
            >
              Mark all read
            </button>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!notifications?.length ? (
          <p className="px-2 py-4 text-sm text-muted-foreground text-center">No notifications yet</p>
        ) : (
          notifications.slice(0, 12).map((n) => {
            const content = (
              <>
                <p className="font-medium text-sm leading-snug">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </>
            );

            if (n.deepLink) {
              return (
                <DropdownMenuItem key={n.id} asChild className="cursor-pointer flex-col items-start py-2">
                  <Link
                    href={n.deepLink}
                    onClick={() => {
                      if (!n.readAt) markRead.mutate(n.id);
                    }}
                  >
                    {content}
                  </Link>
                </DropdownMenuItem>
              );
            }

            return (
              <DropdownMenuItem
                key={n.id}
                className="cursor-pointer flex-col items-start py-2"
                onClick={() => {
                  if (!n.readAt) markRead.mutate(n.id);
                }}
              >
                {content}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
