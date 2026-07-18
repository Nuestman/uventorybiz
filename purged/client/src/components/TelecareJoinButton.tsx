import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Video } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTelecareJoinWindowClock } from "@/components/telecare/useTelecareJoinWindowClock";
import {
  evaluateTelecareJoinEligibility,
  telecareJoinButtonLabel,
  usesInAppTelecareRoom,
  type TelecareJoinEligibilityInput,
  type TelehealthVideoProviderId,
} from "@shared/telecare";

type TelecareConfig = {
  videoProvider: TelehealthVideoProviderId;
  configured: boolean;
};

type TelecareJoinButtonProps = {
  sessionId: string;
  apiPrefix: "staff" | "portal";
  videoProvider?: string | null;
  disabled?: boolean;
  disabledReason?: string;
  size?: "sm" | "default";
  label?: string;
  className?: string;
};

function configPath(apiPrefix: "staff" | "portal"): string {
  return apiPrefix === "portal" ? "/api/portal/telecare/config" : "/api/telecare/config";
}

function joinPath(apiPrefix: "staff" | "portal", sessionId: string): string {
  return apiPrefix === "portal"
    ? `/api/portal/telecare/sessions/${sessionId}/join`
    : `/api/telecare/sessions/${sessionId}/join`;
}

function roomPath(apiPrefix: "staff" | "portal", sessionId: string): string {
  return apiPrefix === "portal"
    ? `/portal/visits/${sessionId}/join`
    : `/telecare/${sessionId}`;
}

export default function TelecareJoinButton({
  sessionId,
  apiPrefix,
  videoProvider: videoProviderProp,
  disabled,
  disabledReason,
  size = "sm",
  label,
  className,
}: TelecareJoinButtonProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: config } = useQuery<TelecareConfig>({
    queryKey: [configPath(apiPrefix)],
    queryFn: getQueryFn<TelecareConfig>({ on401: "throw" }),
    staleTime: 5 * 60_000,
  });

  const provider = videoProviderProp ?? config?.videoProvider ?? "livekit";
  const buttonLabel = label ?? telecareJoinButtonLabel(provider);
  const inApp = usesInAppTelecareRoom(provider);

  const externalJoin = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", joinPath(apiPrefix, sessionId));
      return (await res.json()) as { joinUrl?: string; videoProvider?: string };
    },
    onSuccess: (data) => {
      if (data.joinUrl) {
        window.open(data.joinUrl, "_blank", "noopener,noreferrer");
        toast({
          title: "Opening Microsoft Teams",
          description: "Your visit should open in a new tab.",
        });
        return;
      }
      if (data.videoProvider === "livekit" || !data.joinUrl) {
        navigate(roomPath(apiPrefix, sessionId));
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to join visit",
        description: error.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    if (inApp) {
      navigate(roomPath(apiPrefix, sessionId));
      return;
    }
    externalJoin.mutate();
  };

  return (
    <Button
      type="button"
      size={size}
      className={className}
      disabled={disabled || externalJoin.isPending}
      title={disabled ? disabledReason : undefined}
      onClick={handleClick}
    >
      {externalJoin.isPending ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <Video className="h-3.5 w-3.5 mr-1" />
      )}
      {buttonLabel}
    </Button>
  );
}

export function canPatientJoinTelecare(input: {
  appointmentStatus?: string | null;
  status?: string | null;
  appointmentDate?: string | Date | null;
  scheduledStart?: string | Date | null;
  scheduledEnd?: string | Date | null;
  durationMinutes?: number;
}): { ok: boolean; reason?: string } {
  return evaluateTelecareJoinEligibility({
    audience: "portal",
    appointmentStatus: input.appointmentStatus,
    sessionStatus: input.status,
    scheduledStart: input.scheduledStart ?? input.appointmentDate,
    scheduledEnd: input.scheduledEnd,
    durationMinutes: input.durationMinutes,
  });
}

export function canStaffJoinTelecare(appointment: {
  status?: string | null;
  modality?: string | null;
  telecareSessionId?: string | null;
  appointmentDate?: string | Date | null;
  scheduledStart?: string | Date | null;
  scheduledEnd?: string | Date | null;
  durationMinutes?: number;
  sessionStatus?: string | null;
}): { ok: boolean; reason?: string } {
  return evaluateTelecareJoinEligibility({
    audience: "staff",
    modality: appointment.modality,
    telecareSessionId: appointment.telecareSessionId,
    appointmentStatus: appointment.status,
    sessionStatus: appointment.sessionStatus,
    scheduledStart: appointment.scheduledStart ?? appointment.appointmentDate,
    scheduledEnd: appointment.scheduledEnd,
    durationMinutes: appointment.durationMinutes,
  });
}

export function buildTelecareJoinEligibility(
  input: TelecareJoinEligibilityInput,
): { ok: boolean; reason?: string } {
  return evaluateTelecareJoinEligibility(input);
}
