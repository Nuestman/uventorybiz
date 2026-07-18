import { useEffect, useState } from "react";
import { Activity, Loader2, X } from "lucide-react";
import { Link } from "wouter";

type PortalTelecareWaitingViewProps = {
  providerName: string;
  providerImageUrl?: string | null;
  visitLabel: string;
  scheduledLabel?: string;
  onLeave: () => void;
  leavePending?: boolean;
  audioReady?: boolean;
};

function formatWaitTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PortalTelecareWaitingView({
  providerName,
  providerImageUrl,
  visitLabel,
  scheduledLabel,
  onLeave,
  leavePending,
  audioReady = true,
}: PortalTelecareWaitingViewProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-white to-[#eef2f6] px-4 py-12 text-gray-800">
      <div className="mb-8 flex items-center gap-2 text-gray-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ab8a0] text-[#042a24] text-xs font-bold">
          M
        </span>
        <span className="font-semibold">MineAid</span>
      </div>

      {providerImageUrl ? (
        <img
          src={providerImageUrl}
          alt=""
          className="mb-6 h-20 w-20 rounded-full border-2 border-white object-cover shadow-sm ring-2 ring-gray-200"
        />
      ) : (
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-2xl font-semibold text-[#0a4f6e] shadow-sm ring-2 ring-gray-200">
          {providerName.charAt(0)}
        </div>
      )}

      <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
        You&apos;re in the waiting room
      </h1>
      <p className="mb-8 max-w-md text-center text-gray-600">
        {providerName} will be with you shortly
        <br />
        <span className="text-sm text-gray-500">
          {visitLabel}
          {scheduledLabel ? ` · ${scheduledLabel}` : ""}
        </span>
      </p>

      <div className="mb-6 w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200/80">
        <div className="grid grid-cols-2 items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums text-gray-900">{formatWaitTime(elapsed)}</p>
            <p className="mt-1 text-xs text-gray-500">Time waiting</p>
          </div>
          <div className="border-l border-gray-200 pl-6 text-center">
            <p className="text-sm font-semibold text-[#0a4f6e]">You&apos;re next</p>
            <p className="mt-1 text-xs text-gray-500">Estimated wait: ~2 min</p>
          </div>
        </div>
      </div>

      {audioReady ? (
        <p className="mb-8 flex items-center gap-2 text-sm text-[#0a7a62]">
          <Activity className="h-4 w-4" />
          Audio ready
        </p>
      ) : (
        <p className="mb-8 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking audio…
        </p>
      )}

      <button
        type="button"
        onClick={onLeave}
        disabled={leavePending}
        className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        <X className="h-4 w-4" />
        Leave waiting room
      </button>
    </div>
  );
}

type PortalTelecareReadyViewProps = {
  providerName: string;
  providerImageUrl?: string | null;
  onStart: () => void;
  startPending?: boolean;
};

export function PortalTelecareReadyView({
  providerName,
  providerImageUrl,
  onStart,
  startPending,
}: PortalTelecareReadyViewProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-gradient-to-b from-white to-[#eef2f6] px-4 py-12 text-center text-gray-800">
      <div className="mb-8 flex items-center gap-2 text-gray-900">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1ab8a0] text-[#042a24] text-xs font-bold">
          M
        </span>
        <span className="font-semibold">MineAid</span>
      </div>

      {providerImageUrl ? (
        <img
          src={providerImageUrl}
          alt=""
          className="mb-4 h-20 w-20 rounded-full border-2 border-white object-cover shadow-sm ring-2 ring-gray-200"
        />
      ) : (
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-2xl font-semibold text-[#0a4f6e] shadow-sm ring-2 ring-gray-200">
          {providerName.charAt(0)}
        </div>
      )}

      <p className="mb-2 flex items-center justify-center gap-2 text-sm text-[#0a7a62]">
        <span className="h-2 w-2 rounded-full bg-[#1ab8a0]" />
        Provider has joined
      </p>
      <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">{providerName} is ready</h1>
      <p className="mb-8 text-gray-600">Your visit is starting now</p>

      <button
        type="button"
        onClick={onStart}
        disabled={startPending}
        className="portal-btn-primary px-8 py-3 text-base"
        style={{ backgroundColor: "#1ab8a0", color: "#042a24" }}
      >
        {startPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Start session"}
      </button>
    </div>
  );
}

export function PortalTelecareLeaveLink({ href }: { href: string }) {
  return (
    <Link href={href}>
      <span className="text-sm text-[#0a4f6e] underline hover:text-[#083d55]">Back to appointments</span>
    </Link>
  );
}
