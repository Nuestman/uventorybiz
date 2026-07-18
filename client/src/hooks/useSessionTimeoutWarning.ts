import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

export type SessionTimingResponse = {
  effectiveExpiresAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  limitingFactor: "idle" | "absolute";
  warningLeadSeconds: number;
};

const POLL_MS = 30_000;
/** Re-fetch this far before the warning would show, to pick up server-side idle extensions. */
const REFRESH_LEAD_MS = 2 * POLL_MS;
/** A timing fetched within this window is trusted for declaring local expiry. */
const TIMING_FRESH_MS = 45_000;

function isDocumentHidden(): boolean {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

type UseSessionTimeoutWarningOptions = {
  enabled: boolean;
  timingUrl: string;
  keepaliveUrl: string;
  onSessionEnded: () => void;
};

export function useSessionTimeoutWarning({
  enabled,
  timingUrl,
  keepaliveUrl,
  onSessionEnded,
}: UseSessionTimeoutWarningOptions) {
  const [timing, setTiming] = useState<SessionTimingResponse | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [extending, setExtending] = useState(false);
  const expiredHandled = useRef(false);
  const onSessionEndedRef = useRef(onSessionEnded);
  onSessionEndedRef.current = onSessionEnded;
  const timingRef = useRef<SessionTimingResponse | null>(null);
  const lastFetchAtRef = useRef(0);
  const fetchInFlightRef = useRef(false);

  const fetchTiming = useCallback(async () => {
    if (!enabled || sessionExpired || fetchInFlightRef.current) return null;
    fetchInFlightRef.current = true;
    try {
      const res = await fetch(timingUrl, { credentials: "include" });
      if (!res.ok) return null;
      const data = (await res.json()) as SessionTimingResponse;
      timingRef.current = data;
      setTiming(data);
      return data;
    } catch {
      return null;
    } finally {
      lastFetchAtRef.current = Date.now();
      fetchInFlightRef.current = false;
    }
  }, [enabled, sessionExpired, timingUrl]);

  useEffect(() => {
    if (!enabled) {
      if (!sessionExpired) {
        setTiming(null);
        timingRef.current = null;
        setRemainingSeconds(null);
        setShowWarning(false);
        expiredHandled.current = false;
      }
      return;
    }

    if (sessionExpired) return;

    expiredHandled.current = false;
    void fetchTiming();

    // Poll only when it matters: skip hidden tabs (no one is watching, and background
    // polling keeps the DB compute awake), and skip while expiry is still far off —
    // the local countdown covers that; we re-fetch as the warning window approaches.
    const maybeFetch = () => {
      if (isDocumentHidden()) return;
      const t = timingRef.current;
      if (!t) {
        void fetchTiming();
        return;
      }
      const msUntilExpiry = new Date(t.effectiveExpiresAt).getTime() - Date.now();
      if (msUntilExpiry <= t.warningLeadSeconds * 1000 + REFRESH_LEAD_MS) {
        void fetchTiming();
      }
    };

    const poll = window.setInterval(maybeFetch, POLL_MS);
    const onVisibilityChange = () => {
      if (!isDocumentHidden()) void fetchTiming();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, fetchTiming, sessionExpired]);

  useEffect(() => {
    if (!enabled || !timing || sessionExpired) {
      if (!sessionExpired) {
        setRemainingSeconds(null);
        setShowWarning(false);
      }
      return;
    }

    const tick = () => {
      const expiresAt = new Date(timing.effectiveExpiresAt).getTime();
      const remainingMs = expiresAt - Date.now();
      const seconds = Math.ceil(remainingMs / 1000);
      setRemainingSeconds(seconds);

      if (seconds <= 0) {
        // Timing can be stale (polling pauses on hidden tabs, and activity in another
        // tab extends the same session) — confirm with the server before declaring expiry.
        if (Date.now() - lastFetchAtRef.current > TIMING_FRESH_MS) {
          void fetchTiming();
          return;
        }
        setRemainingSeconds(0);
        setShowWarning(true);
        setSessionExpired(true);
        if (!expiredHandled.current) {
          expiredHandled.current = true;
          onSessionEndedRef.current();
        }
        return;
      }

      setShowWarning(remainingMs <= timing.warningLeadSeconds * 1000);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [enabled, timing, sessionExpired]);

  const staySignedIn = useCallback(async () => {
    if (sessionExpired) return;
    setExtending(true);
    try {
      const res = await apiRequest("POST", keepaliveUrl);
      const data = (await res.json()) as SessionTimingResponse & { ok?: boolean };
      const next: SessionTimingResponse = {
        effectiveExpiresAt: data.effectiveExpiresAt,
        idleExpiresAt: data.idleExpiresAt,
        absoluteExpiresAt: data.absoluteExpiresAt,
        limitingFactor: data.limitingFactor,
        warningLeadSeconds: data.warningLeadSeconds,
      };
      timingRef.current = next;
      lastFetchAtRef.current = Date.now();
      setTiming(next);
      expiredHandled.current = false;
      const remainingMs = new Date(next.effectiveExpiresAt).getTime() - Date.now();
      if (remainingMs > next.warningLeadSeconds * 1000) {
        setShowWarning(false);
      }
    } catch {
      // keep dialog open; next poll or expiry will handle
    } finally {
      setExtending(false);
    }
  }, [keepaliveUrl, sessionExpired]);

  return {
    modalOpen: showWarning || sessionExpired,
    sessionExpired,
    remainingSeconds,
    warningLeadSeconds: timing?.warningLeadSeconds ?? null,
    limitingFactor: timing?.limitingFactor ?? "idle",
    extending,
    staySignedIn,
  };
}

export { formatCountdown };
