import { useRoute, Redirect } from "wouter";

/** @deprecated Use `/assets/fleet/units/:id`. */
export default function AmbulanceDetailLegacyRedirect() {
  const [, params] = useRoute("/operations/ambulances/:id");
  const id = params?.id;
  if (!id) return <Redirect to="/assets/fleet" />;
  return <Redirect to={`/assets/fleet/units/${id}`} />;
}
