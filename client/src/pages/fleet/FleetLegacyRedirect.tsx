import { Redirect } from "wouter";

/**
 * Maps legacy `/fleet` (+ hash tabs) and `/ambulance` paths to `/assets/fleet/*`.
 */
export default function FleetLegacyRedirect() {
  const hash =
    typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
  if (hash === "pre-start") return <Redirect to="/assets/fleet/pre-start" />;
  if (hash === "inventory") return <Redirect to="/assets/fleet/inventory" />;
  return <Redirect to="/assets/fleet" />;
}
