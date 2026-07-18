import { useEffect } from "react";

const BODY_CLASS = "telecare-fullscreen";

/** Locks document scroll while a telecare session occupies the full viewport. */
export function useTelecareFullscreen(active: boolean) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add(BODY_CLASS);
    return () => document.body.classList.remove(BODY_CLASS);
  }, [active]);
}
