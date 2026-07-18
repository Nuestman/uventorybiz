import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type PortalModalShellProps = {
  title: string;
  subtitle?: string;
  step?: number;
  totalSteps?: number;
  onClose?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function PortalModalShell({
  title,
  subtitle,
  step,
  totalSteps,
  onClose,
  children,
  footer,
  className,
}: PortalModalShellProps) {
  const showProgress = step != null && totalSteps != null && totalSteps > 1;

  return (
    <div className={cn("portal-root portal-modal-shell flex max-h-[90vh] flex-col overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 pt-6 pb-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle ? <p className="text-sm text-[var(--portal-muted)] mt-0.5">{subtitle}</p> : null}
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {showProgress ? (
        <div className="portal-modal-progress px-6 pt-4" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={totalSteps}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className="portal-modal-progress-segment"
              data-active={i + 1 <= step ? "true" : "false"}
              aria-hidden
            />
          ))}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

      {footer ? <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">{footer}</div> : null}
    </div>
  );
}
