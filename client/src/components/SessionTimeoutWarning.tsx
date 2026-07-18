import { Clock, LogOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCountdown, useSessionTimeoutWarning } from "@/hooks/useSessionTimeoutWarning";
import { cn } from "@/lib/utils";

type SessionTimeoutWarningProps = {
  variant: "staff" | "portal";
  enabled: boolean;
  loginHref: string | (() => string);
  onSignOut: () => void;
  onSessionEnded: () => void;
};

function ringStrokeColor(remainingSeconds: number): string {
  if (remainingSeconds <= 30) return "#ef4444";
  if (remainingSeconds <= 60) return "#f97316";
  return "#d97706";
}

function SessionCountdownRing({
  remainingSeconds,
  totalSeconds,
}: {
  remainingSeconds: number;
  totalSeconds: number;
}) {
  const size = 176;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, remainingSeconds / Math.max(1, totalSeconds)));
  const dashOffset = circumference * (1 - progress);
  const urgent = remainingSeconds <= 30;
  const stroke = ringStrokeColor(remainingSeconds);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        urgent && "animate-pulse",
      )}
      role="timer"
      aria-live="polite"
      aria-label={`${remainingSeconds} seconds remaining`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 drop-shadow-sm"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/25"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
        <span className="text-[2rem] leading-none font-mono font-semibold tabular-nums text-uventorybiz-navy">
          {formatCountdown(remainingSeconds)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          remaining
        </span>
      </div>
    </div>
  );
}

function SessionEndedPanel({
  variant,
  limitingFactor,
}: {
  variant: "staff" | "portal";
  limitingFactor: "idle" | "absolute";
}) {
  const reason =
    limitingFactor === "idle"
      ? "You were signed out because your session timed out from inactivity."
      : "You were signed out because your session reached its maximum length.";

  return (
    <div className="flex flex-col items-center py-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50 border border-red-100 mb-4">
        <LogOut className="h-9 w-9 text-red-600" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground max-w-sm">{reason}</p>
      <p className="text-xs text-muted-foreground mt-2">
        {variant === "staff"
          ? "Sign in again to continue using uventorybiz."
          : "Sign in again to access your portal."}
      </p>
    </div>
  );
}

export function SessionTimeoutWarning({
  variant,
  enabled,
  loginHref,
  onSignOut,
  onSessionEnded,
}: SessionTimeoutWarningProps) {
  const timingUrl =
    variant === "staff" ? "/api/auth/session-timing" : "/api/portal/auth/session-timing";
  const keepaliveUrl =
    variant === "staff" ? "/api/auth/session-keepalive" : "/api/portal/auth/session-keepalive";

  const {
    modalOpen,
    sessionExpired,
    remainingSeconds,
    warningLeadSeconds,
    limitingFactor,
    extending,
    staySignedIn,
  } = useSessionTimeoutWarning({
    enabled,
    timingUrl,
    keepaliveUrl,
    onSessionEnded,
  });

  const warningReason =
    limitingFactor === "idle"
      ? "You've been inactive and your session is about to expire."
      : "Your session is about to reach its maximum length.";

  const showRing =
    !sessionExpired &&
    remainingSeconds != null &&
    warningLeadSeconds != null &&
    remainingSeconds > 0;

  return (
    <Dialog open={modalOpen} onOpenChange={() => undefined}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {sessionExpired ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-red-600" />
                Session ended
              </DialogTitle>
              <DialogDescription>
                For your security, you have been signed out.
              </DialogDescription>
            </DialogHeader>

            <SessionEndedPanel variant={variant} limitingFactor={limitingFactor} />

            <DialogFooter className="sm:justify-center">
              <Button
                className="w-full sm:w-auto min-w-[180px]"
                onClick={() => {
                  const href = typeof loginHref === "function" ? loginHref() : loginHref;
                  window.location.href = href;
                }}
              >
                Sign in again
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                {variant === "staff" ? "Session expiring soon" : "Sign-in expiring soon"}
              </DialogTitle>
              <DialogDescription>{warningReason}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center py-2">
              {showRing ? (
                <SessionCountdownRing
                  remainingSeconds={remainingSeconds}
                  totalSeconds={warningLeadSeconds}
                />
              ) : (
                <p className="text-4xl font-mono font-semibold tabular-nums text-uventorybiz-navy">--:--</p>
              )}
              <p className="text-sm text-muted-foreground mt-3">Time remaining before sign-out</p>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={onSignOut} disabled={extending}>
                Sign out
              </Button>
              <Button onClick={() => void staySignedIn()} disabled={extending}>
                {extending ? "Extending…" : "Stay signed in"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
