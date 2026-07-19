import { Redirect } from "wouter";

/** @deprecated Use `/assets/fleet`. */
export default function AmbulancesLegacyRedirect() {
  return <Redirect to="/assets/fleet" />;
}
