import { useEffect, useState, type ReactNode } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { LayoutGrid, Rows3 } from "lucide-react";
import type { ConversationSummaryDto } from "@shared/messaging";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PortalEmptyState, PortalLoadingBlock } from "@/portal/portalUi";
import { cn } from "@/lib/utils";
import { isOfflineConversationId } from "@/types/offlineMessaging";

export type MessagingInboxViewMode = "card" | "inbox";

const VIEW_STORAGE_KEY = "uventorybiz.messaging.inboxView";

function formatInboxTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function threadTitle(c: ConversationSummaryDto, staffMode: "patient" | "staff_internal" | "portal") {
  if (staffMode === "staff_internal") return c.subject?.trim() || "Staff thread";
  if (staffMode === "portal") return c.subject?.trim() || "Conversation";
  return c.patientName ?? "Employee";
}

type Props = {
  conversations: ConversationSummaryDto[] | undefined;
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (c: ConversationSummaryDto) => void;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  staffMode?: "patient" | "staff_internal" | "portal";
  headerActions?: ReactNode;
  className?: string;
};

export default function MessagingInboxPanel({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  title,
  description,
  emptyTitle,
  emptyDescription,
  staffMode = "portal",
  headerActions,
  className,
}: Props) {
  const [viewMode, setViewMode] = useState<MessagingInboxViewMode>(() => {
    if (typeof window === "undefined") return "card";
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === "inbox" ? "inbox" : "card";
  });

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  return (
    <Card className={cn("h-fit max-h-[70vh] overflow-hidden flex flex-col", className)}>
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => {
                if (v === "card" || v === "inbox") setViewMode(v);
              }}
              className="border rounded-md"
            >
              <ToggleGroupItem
                value="card"
                aria-label="Card view"
                className="h-8 w-8 p-0"
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="inbox"
                aria-label="Inbox view"
                className="h-8 w-8 p-0"
                title="Inbox view"
              >
                <Rows3 className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            {headerActions}
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-y-auto flex-1 p-0">
        {isLoading ? (
          <PortalLoadingBlock label="Loading inbox…" />
        ) : !conversations?.length ? (
          <PortalEmptyState title={emptyTitle} description={emptyDescription} />
        ) : viewMode === "card" ? (
          <ul className="divide-y">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
                    selectedId === c.id && "bg-muted",
                    c.unreadCount > 0 && selectedId !== c.id && "bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm truncate",
                        c.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium",
                      )}
                    >
                      {threadTitle(c, staffMode)}
                    </p>
                    {c.unreadCount > 0 ? (
                      <Badge variant="default" className="shrink-0">
                        {c.unreadCount}
                      </Badge>
                    ) : null}
                  </div>
                  {staffMode !== "portal" && c.subject && staffMode === "patient" ? (
                    <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                  ) : null}
                  {c.lastMessagePreview ? (
                    <p
                      className={cn(
                        "text-xs truncate mt-0.5",
                        c.unreadCount > 0 ? "text-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {c.lastMessagePreview}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2 mt-1">
                    {c.status !== "open" ? (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {c.status}
                      </Badge>
                    ) : null}
                    {isOfflineConversationId(c.id) ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Pending sync
                      </Badge>
                    ) : null}
                    {c.lastMessageAt ? (
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(c.lastMessageAt), "MMM d, h:mm a")}
                      </p>
                    ) : null}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-border/80">
            {conversations.map((c) => {
              const titleText = threadTitle(c, staffMode);
              const unread = c.unreadCount > 0;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 hover:bg-muted/40 transition-colors grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-0.5 items-start",
                      selectedId === c.id && "bg-muted",
                      unread && selectedId !== c.id && "bg-sky-50/80 dark:bg-sky-950/20",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-2 h-2 w-2 rounded-full shrink-0",
                        unread ? "bg-primary" : "bg-transparent",
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 col-span-1">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span
                          className={cn(
                            "text-sm truncate",
                            unread ? "font-semibold text-foreground" : "font-medium text-foreground/90",
                          )}
                        >
                          {titleText}
                        </span>
                        {staffMode === "patient" && c.subject ? (
                          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                            — {c.subject}
                          </span>
                        ) : null}
                      </div>
                      {c.lastMessagePreview ? (
                        <p
                          className={cn(
                            "text-xs truncate",
                            unread ? "text-foreground/75" : "text-muted-foreground",
                          )}
                        >
                          {c.lastMessagePreview}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No messages yet</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 pl-1">
                      {c.lastMessageAt ? (
                        <span
                          className={cn(
                            "text-[11px] whitespace-nowrap",
                            unread ? "font-medium text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {formatInboxTime(c.lastMessageAt)}
                        </span>
                      ) : null}
                      {unread ? (
                        <Badge className="h-5 min-w-[1.25rem] px-1 text-[10px]">{c.unreadCount}</Badge>
                      ) : null}
                      {isOfflineConversationId(c.id) ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Pending
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
