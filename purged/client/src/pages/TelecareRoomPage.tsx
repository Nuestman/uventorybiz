import { useRoute } from "wouter";
import TelecareRoom from "@/components/telecare/TelecareRoom";

export default function TelecareRoomPage() {
  const [, params] = useRoute("/telecare/:sessionId");
  const sessionId = params?.sessionId ?? "";

  if (!sessionId) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#eef2f6] p-6 text-gray-700">
        <p className="text-sm text-center max-w-md">
          Invalid telehealth session. Open Telehealth from the sidebar to find today&apos;s visits.
        </p>
      </div>
    );
  }

  return (
    <TelecareRoom sessionId={sessionId} audience="staff" backHref="/telecare" />
  );
}
