import { Link } from "wouter";
import { MessageSquare } from "lucide-react";
import { useMessagingUnreadCount } from "@/components/messaging/useMessagingThread";
import { useFeatureEnabled } from "@/hooks/useFeatureFlags";
import { usePortalSession } from "./usePortalSession";
import { cn } from "@/lib/utils";

export function PortalMessagingHeaderLink({ className }: { className?: string }) {
  const { session } = usePortalSession();
  const platformMessagingOn = useFeatureEnabled("messaging");
  const enabled = !!session?.features.messaging && platformMessagingOn;
  const { data } = useMessagingUnreadCount("portal", enabled);
  const count = data?.count ?? 0;

  if (!enabled) return null;

  return (
    <Link
      href="/portal/messages"
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors",
        className,
      )}
      aria-label={count > 0 ? `Messages, ${count} unread` : "Messages"}
      title="Secure messages"
    >
      <MessageSquare className="h-5 w-5" />
      {count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--portal-teal)] px-1 text-[10px] font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
