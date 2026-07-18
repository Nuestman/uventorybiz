import { useRoute } from "wouter";
import TelecareRoom from "@/components/telecare/TelecareRoom";
import { PORTAL_APPOINTMENTS } from "./portalRoutes";
import { usePortalBodyClass } from "./usePortalBodyClass";

export default function PortalTelecareJoinPage() {
  usePortalBodyClass();
  const [, params] = useRoute("/portal/visits/:sessionId/join");
  const sessionId = params?.sessionId ?? "";

  if (!sessionId) {
    return (
      <div className="portal-root portal-page fixed inset-0 z-[100] flex items-center justify-center bg-[var(--portal-surface,#eef2f6)] p-6">
        <p className="text-sm text-[var(--portal-muted)] text-center max-w-md">
          This visit link is invalid. Open Appointments in the portal menu to find your visit.
        </p>
      </div>
    );
  }

  return (
    <TelecareRoom sessionId={sessionId} audience="portal" backHref={PORTAL_APPOINTMENTS} />
  );
}
