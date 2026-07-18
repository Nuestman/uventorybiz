import { useRoute, Redirect } from "wouter";

/** @deprecated Use `/fleet/units/:id`. */
export default function AmbulanceDetailLegacyRedirect() {
  const [, params] = useRoute("/operations/ambulances/:id");
  const id = params?.id;
  if (!id) return <Redirect to="/fleet#fleet" />;
  return <Redirect to={`/fleet/units/${id}`} />;
}
