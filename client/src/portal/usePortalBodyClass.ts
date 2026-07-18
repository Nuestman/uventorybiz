import { useEffect } from "react";

const PORTAL_BODY_CLASS = "portal-route";

/** Marks document body while portal UI is mounted so portaled dialogs inherit portal typography. */
export function usePortalBodyClass() {
  useEffect(() => {
    document.body.classList.add(PORTAL_BODY_CLASS);
    return () => document.body.classList.remove(PORTAL_BODY_CLASS);
  }, []);
}
