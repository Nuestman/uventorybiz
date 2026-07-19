import { Link } from "wouter";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { hasStaffAccess } from "@/routes";
import { useMessagingUnreadCount } from "@/components/messaging/useMessagingThread";
import { useFeatureEnabled } from "@/hooks/useFeatureFlags";
import { cn } from "@/lib/utils";

export function MessagingHeaderLink({ className }: { className?: string }) {
  const { user } = useAuth();
  const messagingOn = useFeatureEnabled("messaging");
  const enabled = hasStaffAccess(user?.role) && messagingOn;
  const { data } = useMessagingUnreadCount("staff", enabled);
  const count = data?.count ?? 0;

  if (!user || !enabled) return null;

  return (
    <Link
      href="/messages"
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-md text-uventorybiz-gray hover:text-uventorybiz-navy hover:bg-muted transition-colors",
        className,
      )}
      aria-label={count > 0 ? `Messages, ${count} unread` : "Messages"}
      title="Secure messaging"
    >
      <MessageSquare className="h-5 w-5" />
      {count > 0 ? (
        <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-uventorybiz-coral px-1 text-[10px] font-bold text-white ring-2 ring-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
