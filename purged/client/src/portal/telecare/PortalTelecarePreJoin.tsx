import { useEffect, useRef } from "react";
import { Activity, Camera, CameraOff, Info, Loader2, Mic, MicOff, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type PortalTelecarePreJoinProps = {
  title: string;
  subtitle?: string;
  scheduledLabel?: string;
  patientName?: string;
  patientImageUrl?: string | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onJoin: () => void;
  joining: boolean;
  startPreview: () => Promise<MediaStream | null>;
  stopPreview?: () => void;
  primaryColor?: string;
  className?: string;
};

export function PortalTelecarePreJoin({
  title,
  subtitle,
  scheduledLabel,
  patientName,
  patientImageUrl,
  micEnabled,
  cameraEnabled,
  onToggleMic,
  onToggleCamera,
  onJoin,
  joining,
  startPreview,
  stopPreview,
  primaryColor = "#0a4f6e",
  className,
}: PortalTelecarePreJoinProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => () => stopPreview?.(), [stopPreview]);

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
    <div className={cn("portal-modal-shell max-w-lg mx-auto", className)}>
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle ? <p className="text-sm text-[var(--portal-muted)] mt-0.5">{subtitle}</p> : null}
      </div>

      <div className="p-6 space-y-5">
        <div className="relative aspect-video rounded-2xl bg-gray-100 overflow-hidden border border-gray-200">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover mirror-video" />
          {!cameraEnabled ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 text-gray-500 gap-2">
              {patientImageUrl ? (
                <img src={patientImageUrl} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-white" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center text-xl font-semibold text-gray-600">
                  {patientName?.charAt(0) ?? "P"}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700">{patientName ?? "You"}</span>
              <span className="text-xs text-gray-500">Camera preview</span>
            </div>
          ) : null}
          {micEnabled ? (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-sm">
              <Activity className="h-3.5 w-3.5 text-[var(--portal-mint)]" />
            </div>
          ) : null}
        </div>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={onToggleMic}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              micEnabled ? "border-gray-200 bg-white text-gray-800" : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {micEnabled ? "Mic on" : "Mic off"}
          </button>
          <button
            type="button"
            onClick={onToggleCamera}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              cameraEnabled ? "border-gray-200 bg-white text-gray-800" : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            {cameraEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
            {cameraEnabled ? "Camera on" : "Camera off"}
          </button>
        </div>

        {scheduledLabel ? (
          <div className="portal-info-box flex gap-2.5">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{scheduledLabel}</p>
          </div>
        ) : null}

        <button
          type="button"
          className="portal-btn-primary w-full py-3"
          style={{ backgroundColor: primaryColor }}
          disabled={joining}
          onClick={onJoin}
        >
          {joining ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <Video className="h-4 w-4" />
              Enter waiting room
            </>
          )}
        </button>
      </div>
    </div>
  );
}
