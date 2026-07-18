import { useEffect } from "react";
import { portalSignInUrl } from "./portalRoutes";

/** Legacy /portal/login URLs → marketing page with sign-in modal. */
export default function PortalLoginPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    window.location.replace(
      portalSignInUrl({
        org: params.get("org") || undefined,
        error: params.get("error") || undefined,
      }),
    );
  }, []);
  return null;
}
