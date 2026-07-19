import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, ExternalLink, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import type { Notification } from "@shared/schema";
import MobileNav from "@/components/MobileNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { getNotificationHref, notificationIsUnread } from "@/lib/notificationUtils";
import { cn } from "@/lib/utils";

const CHANNELS = ["all", "email", "in_app", "sms", "whatsapp"] as const;
type ChannelFilter = (typeof CHANNELS)[number];

function invalidateNotificationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
}

export default function NotificationsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [channel, setChannel] = useState<ChannelFilter>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const queryParams = useMemo(() => {
    const p: Record<string, string | number | boolean> = { limit: 500 };
    if (channel !== "all") p.channel = channel;
    if (unreadOnly) p.unreadOnly = true;
    return p;
  }, [channel, unreadOnly]);

  const { data = [], isLoading, isError, refetch } = useQuery<Notification[]>({
    queryKey: ["/api/notifications", queryParams],
    queryFn: getQueryFn<Notification[]>({ on401: "throw" }),
    enabled: !!user,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  const items = Array.isArray(data) ? data : [];

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
    onSuccess: () => {
      invalidateNotificationQueries(queryClient);
      toast({ title: "All notifications marked as read" });
    },
    onError: () => {
      toast({ title: "Could not mark all as read", variant: "destructive" });
    },
  });

  if (authLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const unreadInView = items.filter(notificationIsUnread).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <MobileNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border shadow-sm">
                <Bell className="h-5 w-5 text-uventorybiz-navy" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Your personal inbox: each row is addressed to you as the recipient. New incident alerts include safety officers automatically when they have no
                preferences yet.
              </p>
            </div>
          </div>
          <div className="flex sm:flex-col items-center gap-2">
            <Select value={channel} onValueChange={(v) => setChannel(v as ChannelFilter)}>
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="in_app">In-app</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={unreadOnly ? "unread" : "all"}
              onValueChange={(v) => setUnreadOnly(v === "unread")}
            >
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All items</SelectItem>
                <SelectItem value="unread">Unread only</SelectItem>
              </SelectContent>
            </Select>
            {unreadInView > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="bg-white"
                disabled={markAllMutation.isPending}
                onClick={() => markAllMutation.mutate()}
              >
                {markAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4" />
                )}
                <span className="ml-2">Mark all read</span>
              </Button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="py-10 text-center text-destructive">
              Could not load notifications.{" "}
              <button type="button" className="underline font-medium" onClick={() => refetch()}>
                Retry
              </button>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No notifications match these filters.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="hidden md:block">
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="w-[28%]">Title</TableHead>
                      <TableHead className="w-[36%]">Message</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">When</TableHead>
                      <TableHead className="w-[100px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((n, index) => {
                      const unread = notificationIsUnread(n);
                      const href = getNotificationHref(n.metadata);
                      return (
                        <TableRow key={n.id} className={cn(unread && "bg-uventorybiz-coral/5")}>
                          <TableCell className="font-medium text-muted-foreground tabular-nums align-top">{index + 1}</TableCell>
                          <TableCell className="font-medium align-top">{n.title}</TableCell>
                          <TableCell className="text-sm text-muted-foreground align-top line-clamp-3">
                            {n.message}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className="capitalize">
                              {String(n.channel ?? "").replace(/_/g, " ") || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant={unread ? "default" : "secondary"}>
                              {unread ? "Unread" : "Read"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground align-top text-right whitespace-nowrap">
                            {n.createdAt
                              ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right align-top">
                            <div className="flex justify-end gap-1">
                              {href ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2"
                                  title="Open linked page"
                                  onClick={() => {
                                    if (unread) markReadMutation.mutate(n.id);
                                    navigate(href);
                                  }}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              ) : null}
                              {unread ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs"
                                  disabled={markReadMutation.isPending}
                                  onClick={() => markReadMutation.mutate(n.id)}
                                >
                                  Mark read
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </div>

            <div className="md:hidden space-y-3">
              {items.map((n) => {
                const unread = notificationIsUnread(n);
                const href = getNotificationHref(n.metadata);
                return (
                  <Card key={n.id} className={cn(unread && "border-uventorybiz-coral/30")}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className={cn("text-sm font-semibold", unread ? "text-gray-900" : "text-gray-700")}>
                          {n.title}
                        </h2>
                        <Badge variant="outline" className="capitalize shrink-0">
                          {String(n.channel ?? "").replace(/_/g, " ") || "—"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {n.createdAt
                            ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                            : ""}
                        </span>
                        <Badge variant={unread ? "default" : "secondary"}>{unread ? "Unread" : "Read"}</Badge>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {href ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              if (unread) markReadMutation.mutate(n.id);
                              navigate(href);
                            }}
                          >
                            Open
                          </Button>
                        ) : null}
                        {unread ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={() => markReadMutation.mutate(n.id)}
                          >
                            Mark read
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {items.length >= 500 ? (
              <p className="text-center text-xs text-muted-foreground">
                Showing up to 500 notifications. Older items are not listed here.
              </p>
            ) : null}
          </>
        )}

        <p className="text-center text-sm">
          <Link href="/settings#notifications" className="text-uventorybiz-navy font-medium hover:underline">
            Configure notification preferences
          </Link>
        </p>
      </div>
    </div>
  );
}
