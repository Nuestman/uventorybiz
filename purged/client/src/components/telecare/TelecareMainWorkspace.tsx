import { FileText, Video } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { TelecareAudience, TelecareSessionDetailResponse } from "@shared/telecare";
import TelecareVideoPanel from "./TelecareVideoPanel";
import { TelecareSessionTabTrigger, TelecareSessionTabsList } from "./TelecareSessionTabs";

type TelecareMainWorkspaceProps = {
  audience: TelecareAudience;
  detail: TelecareSessionDetailResponse;
  waitingForProvider?: boolean;
  onProviderJoined?: () => void;
  encounterId?: string | null;
  patientId?: string | null;
};

export default function TelecareMainWorkspace({
  audience,
  detail,
  waitingForProvider,
  onProviderJoined,
  encounterId,
  patientId,
}: TelecareMainWorkspaceProps) {
  const showDocTab = audience === "staff";
  const resolvedEncounterId = encounterId ?? detail.encounterId ?? null;
  const docSrc =
    resolvedEncounterId && patientId
      ? `/encounter?patientId=${encodeURIComponent(patientId)}&embed=1`
      : null;

  if (!showDocTab) {
    return (
      <div className="h-full min-h-0 min-w-0 overflow-hidden rounded-xl bg-gray-900">
        <TelecareVideoPanel
          audience={audience}
          waitingForProvider={waitingForProvider}
          onProviderJoined={onProviderJoined}
        />
      </div>
    );
  }

  return (
    <Tabs
      defaultValue="video"
      className="h-full flex flex-col min-h-0 min-w-0 overflow-hidden bg-white rounded-xl"
    >
      <TelecareSessionTabsList columns={2} className="mb-0">
        <TelecareSessionTabTrigger value="video">
          <Video className="h-4 w-4 shrink-0" />
          <span className="truncate">Video</span>
        </TelecareSessionTabTrigger>
        <TelecareSessionTabTrigger value="documentation" disabled={!docSrc}>
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">Documentation</span>
        </TelecareSessionTabTrigger>
      </TelecareSessionTabsList>

      <TabsContent
        value="video"
        className="flex-1 min-h-0 min-w-0 mt-2 data-[state=inactive]:hidden overflow-hidden"
        forceMount
      >
        <div className="h-full min-h-0 min-w-0 overflow-hidden rounded-xl bg-gray-900">
          <TelecareVideoPanel
            audience={audience}
            waitingForProvider={waitingForProvider}
            onProviderJoined={onProviderJoined}
          />
        </div>
      </TabsContent>

      <TabsContent
        value="documentation"
        className="flex-1 min-h-0 min-w-0 mt-2 data-[state=inactive]:hidden overflow-hidden"
        forceMount
      >
        {docSrc ? (
          <iframe
            title="Encounter documentation"
            src={docSrc}
            className="h-full w-full min-h-0 max-w-full rounded-xl border border-gray-200 bg-white"
          />
        ) : (
          <div className="h-full min-h-[200px] flex items-center justify-center text-sm text-gray-500 border border-gray-200 rounded-xl bg-gray-50 p-4 text-center">
            Open an encounter before documenting this visit.
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
