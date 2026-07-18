import { useEffect, useRef } from "react";
import { Camera, CameraOff, Loader2, Mic, MicOff, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type TelecarePreJoinProps = {
  title: string;
  description: string;
  scheduledLabel?: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onJoin: () => void;
  joining: boolean;
  startPreview: () => Promise<MediaStream | null>;
  stopPreview?: () => void;
  primaryColor?: string;
};

export default function TelecarePreJoin({
  title,
  description,
  scheduledLabel,
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onJoin,
  joining,
  startPreview,
  stopPreview,
  primaryColor = "#142F5C",
}: TelecarePreJoinProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      stopPreview?.();
    };
  }, [stopPreview]);

  useEffect(() => {
    let active = true;
    void startPreview().then((stream) => {
      if (!active || !stream || !videoRef.current) return;
      videoRef.current.srcObject = stream;
    });
    return () => {
      active = false;
    };
  }, [startPreview, micEnabled, cameraEnabled]);

  return (
    <Card className="border-gray-200 shadow-sm overflow-hidden max-w-2xl">
      <div className="h-1.5" style={{ backgroundColor: primaryColor }} />
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
          <Video className="h-5 w-5 text-mineaid-navy" />
          {title}
        </CardTitle>
        <CardDescription className="text-mineaid-gray">{description}</CardDescription>
        {scheduledLabel ? <p className="text-sm text-mineaid-gray pt-1">{scheduledLabel}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video rounded-lg bg-slate-900 overflow-hidden border border-gray-200">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror-video" />
          {!cameraEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-300 text-sm">
              Camera off
            </div>
          )}
        </div>

        <div className="flex justify-center gap-3">
          <Button
            type="button"
            variant={micEnabled ? "secondary" : "destructive"}
            size="icon"
            aria-pressed={micEnabled}
            aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
            onClick={onToggleMic}
          >
            {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant={cameraEnabled ? "secondary" : "destructive"}
            size="icon"
            aria-pressed={cameraEnabled}
            aria-label={cameraEnabled ? "Turn camera off" : "Turn camera on"}
            onClick={onToggleCamera}
          >
            {cameraEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
          </Button>
        </div>

        <Button
          type="button"
          className="w-full bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
          disabled={joining}
          onClick={onJoin}
        >
          {joining ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting…
            </>
          ) : (
            "Join video visit"
          )}
        </Button>

        <p className="text-xs text-mineaid-gray text-center">
          Allow camera and microphone when your browser prompts you.
        </p>
      </CardContent>
    </Card>
  );
}
