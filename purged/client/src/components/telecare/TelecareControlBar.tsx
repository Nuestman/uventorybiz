import { useConnectionState, useLocalParticipant } from "@livekit/components-react";
import { ConnectionState } from "livekit-client";
import { Camera, CameraOff, Mic, MicOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type TelecareControlBarProps = {
  onLeave: () => void;
  leaveLabel?: string;
};

export default function TelecareControlBar({ onLeave, leaveLabel = "End visit" }: TelecareControlBarProps) {
  const { toast } = useToast();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const connected = connectionState === ConnectionState.Connected;
  const micOn = localParticipant?.isMicrophoneEnabled ?? false;
  const camOn = localParticipant?.isCameraEnabled ?? false;

  const toggleMic = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setMicrophoneEnabled(!micOn);
    } catch {
      toast({
        title: "Microphone unavailable",
        description: "Allow microphone access in your browser settings and try again.",
        variant: "destructive",
      });
    }
  };

  const toggleCamera = async () => {
    if (!localParticipant) return;
    try {
      await localParticipant.setCameraEnabled(!camOn);
    } catch {
      toast({
        title: "Camera unavailable",
        description: "Allow camera access in your browser settings and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <Button
        type="button"
        size="icon"
        variant={micOn ? "secondary" : "destructive"}
        aria-pressed={micOn}
        aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
        disabled={!connected || !localParticipant}
        onClick={() => void toggleMic()}
      >
        {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant={camOn ? "secondary" : "destructive"}
        aria-pressed={camOn}
        aria-label={camOn ? "Turn camera off" : "Turn camera on"}
        disabled={!connected || !localParticipant}
        onClick={() => void toggleCamera()}
      >
        {camOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        variant="destructive"
        className="gap-2 px-4"
        aria-label={leaveLabel}
        onClick={onLeave}
      >
        <PhoneOff className="h-4 w-4" />
        <span className="text-sm">{leaveLabel}</span>
      </Button>
    </div>
  );
}
