import { useEffect, useState } from "react";

/** Re-render on an interval so join-window checks stay current without refetching. */
export function useTelecareJoinWindowClock(intervalMs = 30_000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return tick;
}
