import { useRoute, Redirect } from "wouter";

/** Legacy `/fleet/units/:id` or `/fleets/units/:id` → `/assets/fleet/units/:id`. */
export default function FleetUnitPathRedirect() {
  const [, fleetParams] = useRoute("/fleet/units/:id");
  const [, fleetsParams] = useRoute("/fleets/units/:id");
  const id = fleetParams?.id ?? fleetsParams?.id;
  if (!id) return <Redirect to="/assets/fleet" />;
  return <Redirect to={`/assets/fleet/units/${id}`} />;
}
