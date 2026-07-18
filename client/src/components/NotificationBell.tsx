import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import type { Notification } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { getNotificationHref, notificationIsUnread } from "@/lib/notificationUtils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

function invalidateNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
}

/**
 * Header bell: shows all notification rows for the user (email, in-app, etc.).
 * Many tenants only enable email; those rows still appear here so the feed matches Admin/history.
 */
export function NotificationBell({ className }: { className?: string }) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const listQuery = useQuery<Notification[]>({
    queryKey: ["/api/notifications", { limit: 50 }],
    queryFn: getQueryFn<Notification[]>({ on401: "throw" }),
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const unreadQuery = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: getQueryFn<{ count: number }>({ on401: "throw" }),
    enabled: !!user,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PUT", `/api/notifications/${id}/read`);
    },
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/notifications/read-all");
    },
    onSuccess: () => invalidateNotificationQueries(queryClient),
  });

  if (!user) return null;

  const items = Array.isArray(listQuery.data) ? listQuery.data : [];
  const apiUnread = unreadQuery.data?.count ?? 0;
  const unreadInPreview = items.filter(notificationIsUnread).length;
  /** Prefer API total; if it lags at 0 but the loaded list has unread rows, show at least that count. */
  const unreadCount = Math.max(apiUnread, unreadInPreview);
  const showBadge = unreadCount > 0;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      listQuery.refetch();
      unreadQuery.refetch();
    }
  };

  const onItemActivate = (n: Notification) => {
    if (notificationIsUnread(n)) {
      markReadMutation.mutate(n.id);
    }
    const href = getNotificationHref(n.metadata);
    if (href) {
      setOpen(false);
      navigate(href);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative shrink-0 overflow-visible px-3",
            className
          )}
          aria-label={showBadge ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <span className="relative inline-flex">
            <Bell className="h-4 w-4 text-uventorybiz-gray" />
            {showBadge ? (
              <span
                className="pointer-events-none absolute -right-2 -top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-uventorybiz-coral px-1 text-[11px] font-bold leading-none text-white shadow-sm tabular-nums"
                aria-hidden
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-2rem,22rem)] p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold text-gray-900">Notifications</span>
          {items.some(notificationIsUnread) ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-xs text-uventorybiz-navy"
              disabled={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
            >
              {markAllMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Mark all read
            </Button>
          ) : null}
        </div>
        <ScrollArea className="h-[min(24rem,50vh)]">
          {listQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : listQuery.isError ? (
            <div className="px-3 py-6 text-center text-sm text-destructive">Could not load notifications.</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            <ul className="divide-y">
              {items.length >= 50 ? (
                <li className="px-3 py-2 text-[11px] text-muted-foreground bg-gray-50/80">
                  Showing the 50 most recent. Open “All notifications” for the full list.
                </li>
              ) : null}
              {items.map((n) => {
                const unread = notificationIsUnread(n);
                const href = getNotificationHref(n.metadata);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-gray-50",
                        unread && "bg-uventorybiz-coral/5"
                      )}
                      onClick={() => onItemActivate(n)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn("text-sm leading-snug", unread ? "font-semibold text-gray-900" : "font-medium text-gray-700")}>
                          {n.title}
                        </span>
                        {href ? <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden /> : null}
                      </div>
                      <p className="text-xs !font-sans !tracking-normal line-clamp-3">{n.message}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span className="capitalize">{String(n.channel ?? "").replace(/_/g, " ") || "—"}</span>
                        <span aria-hidden>·</span>
                        <span>
                          {n.createdAt
                            ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                            : ""}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="flex flex-col gap-1 border-t px-3 py-2">
          <Link
            href="/notifications"
            className="text-xs font-medium text-uventorybiz-navy hover:underline"
            onClick={() => setOpen(false)}
          >
            All notifications
          </Link>
          <Link
            href="/settings#notifications"
            className="text-xs font-medium text-uventorybiz-navy/80 hover:underline"
            onClick={() => setOpen(false)}
          >
            Notification preferences
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
