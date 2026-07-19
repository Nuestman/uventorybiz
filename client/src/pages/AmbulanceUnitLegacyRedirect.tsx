import { useRoute, Redirect } from "wouter";

/** @deprecated Use `/assets/fleet/units/:id`. */
export default function AmbulanceUnitLegacyRedirect() {
  const [, params] = useRoute("/ambulance/units/:id");
  const id = params?.id;
  if (!id) return <Redirect to="/assets/fleet" />;
  return <Redirect to={`/assets/fleet/units/${id}`} />;
}
