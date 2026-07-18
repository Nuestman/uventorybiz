import { Redirect } from "wouter";

/** @deprecated Use `/fleet`. */
export default function AmbulancesLegacyRedirect() {
  return <Redirect to="/fleet#fleet" />;
}
