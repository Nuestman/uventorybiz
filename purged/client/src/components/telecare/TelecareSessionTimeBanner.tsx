import { AlertTriangle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TelecareSessionExtendMinutes } from "@shared/telecare";
import { TELEcare_SESSION_EXTEND_MINUTES_OPTIONS } from "@shared/telecare";

type TelecareSessionTimeBannerProps = {
  variant: "warn5" | "warn1" | "timeup";
  remainingMinutes: number | null;
  autoEndCountdownMinutes: number | null;
  staffCanExtend: boolean;
  extendSessionPending?: boolean;
  endSessionPending?: boolean;
  onDismiss?: () => void;
  onExtend?: (minutes: TelecareSessionExtendMinutes) => void;
  onEndNow?: () => void;
};

export default function TelecareSessionTimeBanner({
  variant,
  remainingMinutes,
  autoEndCountdownMinutes,
  staffCanExtend,
  extendSessionPending,
  endSessionPending,
  onDismiss,
  onExtend,
  onEndNow,
}: TelecareSessionTimeBannerProps) {
  const mins = Math.max(1, Math.ceil(remainingMinutes ?? (variant === "warn5" ? 5 : 1)));

  const shell =
    variant === "timeup"
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : variant === "warn1"
        ? "border-orange-300 bg-orange-50 text-orange-950"
        : "border-sky-300 bg-sky-50 text-sky-950";

  const title =
    variant === "timeup"
      ? "Scheduled time has ended"
      : variant === "warn1"
        ? "One minute remaining"
        : "Visit ending soon";

  const description =
    variant === "timeup"
      ? staffCanExtend
        ? `The appointment slot is over.${autoEndCountdownMinutes != null ? ` The visit will end automatically in about ${autoEndCountdownMinutes} minute(s) unless you extend.` : ""}`
        : `The appointment slot is over.${autoEndCountdownMinutes != null ? ` The visit will end in about ${autoEndCountdownMinutes} minute(s).` : ""}`
      : variant === "warn1"
        ? staffCanExtend
          ? "Your scheduled slot ends in about one minute. Extend if you need more time, or wrap up now."
          : "Your scheduled appointment slot ends in about one minute. Please wrap up now."
        : `Your scheduled visit ends in about ${mins} minute(s). Please begin wrapping up.`;

  return (
    <div
      role="status"
      className={`shrink-0 rounded-xl border px-3 py-2.5 sm:px-4 shadow-sm ${shell}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-2 min-w-0">
          {variant === "warn5" ? (
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs sm:text-sm mt-0.5 opacity-90">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
          {variant === "timeup" && staffCanExtend ? (
            <>
              {TELEcare_SESSION_EXTEND_MINUTES_OPTIONS.map((extendMins) => (
                <Button
                  key={extendMins}
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={extendSessionPending || endSessionPending}
                  onClick={() => onExtend?.(extendMins)}
                >
                  {extendSessionPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Extend +${extendMins} min`
                  )}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={extendSessionPending || endSessionPending}
                onClick={onEndNow}
              >
                {endSessionPending ? "Ending…" : "End visit now"}
              </Button>
            </>
          ) : variant === "warn1" && staffCanExtend ? (
            <>
              {TELEcare_SESSION_EXTEND_MINUTES_OPTIONS.map((extendMins) => (
                <Button
                  key={extendMins}
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={extendSessionPending}
                  onClick={() => onExtend?.(extendMins)}
                >
                  {extendSessionPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Extend +${extendMins} min`
                  )}
                </Button>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
                End on time
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
              OK
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
