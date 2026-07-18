import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  TelecareAudience,
  TelecareJoinResponse,
  TelecareRoomCredentials,
  TelecareRoomPhase,
  TelecareSessionDetailResponse,
} from "@shared/telecare";
import {
  hasPatientTelehealthConsent,
  isWithinTelecareJoinWindow,
  resolveScheduledEnd,
  telecareJoinWindowMessage,
} from "@shared/telecare";
import type { TelecareEndReason } from "./TelecareInCallShell";

type UseTelecareRoomOptions = {
  sessionId: string;
  audience: TelecareAudience;
};

function apiBase(audience: TelecareAudience): string {
  return audience === "portal" ? "/api/portal/telecare" : "/api/telecare";
}

function invalidateTelecareListViews(
  queryClient: ReturnType<typeof useQueryClient>,
  audience: TelecareAudience,
) {
  void queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
  void queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string) === "/api/appointments" });
  void queryClient.invalidateQueries({ queryKey: ["/api/telecare/queue/today"] });
  if (audience === "portal") {
    void queryClient.invalidateQueries({ queryKey: ["/api/portal/telecare/sessions"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/portal/appointments"] });
    void queryClient.invalidateQueries({ queryKey: ["/api/portal/home"] });
  }
}

export function useTelecareRoom({ sessionId, audience }: UseTelecareRoomOptions) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<TelecareRoomPhase>("loading");
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [roomCreds, setRoomCreds] = useState<TelecareRoomCredentials | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [endedAt, setEndedAt] = useState<Date | null>(null);
  const [endReason, setEndReason] = useState<TelecareEndReason>("user");
  const [endedPatientId, setEndedPatientId] = useState<string | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const terminalExitRef = useRef(false);
  const joiningAfterEncounterRef = useRef(false);
  const inCallPhase = phase === "waiting" || phase === "incall";

  const detailQuery = useQuery<TelecareSessionDetailResponse>({
    queryKey: [apiBase(audience), "sessions", sessionId, "detail"],
    queryFn: async () => {
      const res = await apiRequest("GET", `${apiBase(audience)}/sessions/${sessionId}`);
      return (await res.json()) as TelecareSessionDetailResponse;
    },
    enabled: !!sessionId,
    retry: false,
    refetchInterval: inCallPhase ? 10_000 : false,
  });

  useEffect(() => {
    if (detailQuery.data?.encounterId) {
      setEncounterId(detailQuery.data.encounterId);
    }
  }, [detailQuery.data?.encounterId]);

  const disconnectLocally = useCallback(
    (reason: TelecareEndReason, patientId?: string | null) => {
      terminalExitRef.current = true;
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
      setEndedAt(new Date());
      setEndReason(reason);
      if (patientId) setEndedPatientId(patientId);
      setRoomCreds(null);
      setPhase("ended");
    },
    [],
  );

  useEffect(() => {
    const status = detailQuery.data?.session?.status;
    if (!inCallPhase || !status) return;
    if (["completed", "cancelled", "no_show", "failed"].includes(status)) {
      disconnectLocally("remote", detailQuery.data?.patient?.patientId ?? null);
      invalidateTelecareListViews(queryClient, audience);
    }
  }, [
    audience,
    detailQuery.data?.patient?.patientId,
    detailQuery.data?.session?.status,
    disconnectLocally,
    inCallPhase,
    queryClient,
  ]);

  const stopPreview = useCallback(() => {
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    previewStreamRef.current = null;
  }, []);

  const startPreview = useCallback(async () => {
    stopPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: micEnabled,
        video: cameraEnabled,
      });
      previewStreamRef.current = stream;
      return stream;
    } catch {
      return null;
    }
  }, [cameraEnabled, micEnabled, stopPreview]);

  useEffect(() => () => stopPreview(), [stopPreview]);

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `${apiBase(audience)}/sessions/${sessionId}/join`);
      return (await res.json()) as TelecareJoinResponse;
    },
    onSuccess: (data) => {
      joiningAfterEncounterRef.current = false;
      if (data.joinUrl) {
        window.open(data.joinUrl, "_blank", "noopener,noreferrer");
        setPhase("ended");
        stopPreview();
        return;
      }
      if (!data.room) {
        setGateMessage("Video visit is not available yet. Please try again shortly.");
        setPhase("error");
        return;
      }
      setRoomCreds(data.room);
      if (audience === "portal" && data.session.status === "waiting_room") {
        setPhase("waiting");
      } else {
        setPhase("incall");
      }
    },
    onError: (error: Error) => {
      joiningAfterEncounterRef.current = false;
      setGateMessage(error.message.replace(/^\d+:\s*/, ""));
      setPhase("gate");
    },
  });

  useEffect(() => {
    if (terminalExitRef.current) return;

    if (detailQuery.isLoading) {
      setPhase((current) => (current === "ended" ? "ended" : "loading"));
      return;
    }
    if (detailQuery.isError) {
      setGateMessage(
        detailQuery.error instanceof Error
          ? detailQuery.error.message.replace(/^\d+:\s*/, "")
          : "Unable to load visit details",
      );
      setPhase("gate");
      return;
    }

    const session = detailQuery.data?.session;
    const appointment = detailQuery.data?.appointment;
    if (!session) {
      setGateMessage("This visit could not be found.");
      setPhase("gate");
      return;
    }
    if (["completed", "cancelled", "no_show", "failed"].includes(session.status)) {
      setGateMessage("This visit has ended.");
      setPhase("gate");
      return;
    }
    if (audience === "portal" && appointment?.status === "scheduled") {
      setGateMessage("Please confirm your appointment in the portal before joining.");
      setPhase("gate");
      return;
    }
    const scheduledStart = session.scheduledStart ?? appointment?.appointmentDate;
    const scheduledEnd = session.scheduledEnd
      ? new Date(String(session.scheduledEnd))
      : scheduledStart
        ? resolveScheduledEnd(scheduledStart, null, appointment?.durationMinutes)
        : null;
    if (
      scheduledStart &&
      !isWithinTelecareJoinWindow(
        scheduledStart,
        scheduledEnd,
        appointment?.durationMinutes,
      )
    ) {
      setGateMessage(telecareJoinWindowMessage(scheduledEnd));
      setPhase("gate");
      return;
    }

    if (audience === "portal" && !hasPatientTelehealthConsent(session)) {
      setPhase((current) =>
        current === "loading" || current === "gate" || current === "error" ? "consent" : current,
      );
      return;
    }

    if (audience === "staff" && !detailQuery.data?.encounterId && !encounterId) {
      setPhase((current) =>
        current === "loading" || current === "gate" || current === "error" || current === "consent"
          ? "encounter_setup"
          : current,
      );
      return;
    }

    if (joinMutation.isPending || joiningAfterEncounterRef.current) {
      setPhase((current) =>
        current === "encounter_setup" || current === "loading" ? "loading" : current,
      );
      return;
    }

    setPhase((current) =>
      ["loading", "gate", "error", "consent", "encounter_setup"].includes(current) ? "prejoin" : current,
    );
  }, [
    audience,
    detailQuery.data,
    detailQuery.error,
    detailQuery.isError,
    detailQuery.isLoading,
    encounterId,
    joinMutation.isPending,
  ]);

  const consentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `${apiBase(audience)}/sessions/${sessionId}/consent`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [apiBase(audience), "sessions", sessionId, "detail"] });
      setPhase("prejoin");
    },
    onError: (error: Error) => {
      setGateMessage(error.message.replace(/^\d+:\s*/, ""));
      setPhase("error");
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `${apiBase(audience)}/sessions/${sessionId}/complete`);
      return res.json();
    },
  });

  const extendMutation = useMutation({
    mutationFn: async (additionalMinutes: 15 | 30) => {
      const res = await apiRequest("POST", `${apiBase(audience)}/sessions/${sessionId}/extend`, {
        additionalMinutes,
      });
      return res.json() as Promise<{ scheduledEnd: string }>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [apiBase(audience), "sessions", sessionId, "detail"] });
    },
  });

  const handleProviderJoined = useCallback(() => {
    setPhase((current) => (current === "waiting" ? "incall" : current));
  }, []);

  const endSession = useCallback(
    async (reason: TelecareEndReason) => {
      const patientId = detailQuery.data?.patient?.patientId ?? null;
      stopPreview();
      if (reason !== "remote") {
        try {
          await completeMutation.mutateAsync();
        } catch {
          /* session may already be completed */
        }
        invalidateTelecareListViews(queryClient, audience);
      }
      disconnectLocally(reason, patientId);
    },
    [audience, completeMutation, detailQuery.data?.patient?.patientId, disconnectLocally, queryClient, stopPreview],
  );

  const joinVisit = useCallback(() => {
    stopPreview();
    joinMutation.mutate();
  }, [joinMutation, stopPreview]);

  const acceptConsent = useCallback(() => {
    consentMutation.mutate();
  }, [consentMutation]);

  const markExternalJoinComplete = useCallback(() => {
    setEndedAt(new Date());
    setEndReason("user");
    setPhase("ended");
  }, []);

  const onEncounterReady = useCallback(
    (id: string) => {
      setEncounterId(id);
      joiningAfterEncounterRef.current = true;
      setPhase("loading");
      void queryClient.invalidateQueries({ queryKey: [apiBase(audience), "sessions", sessionId, "detail"] });
      stopPreview();
      joinMutation.mutate();
    },
    [audience, joinMutation, queryClient, sessionId, stopPreview],
  );

  return {
    phase,
    gateMessage,
    detailQuery,
    roomCreds,
    encounterId,
    micEnabled,
    setMicEnabled,
    cameraEnabled,
    setCameraEnabled,
    previewStreamRef,
    startPreview,
    stopPreview,
    joinVisit,
    joinPending: joinMutation.isPending,
    acceptConsent,
    consentPending: consentMutation.isPending,
    handleProviderJoined,
    endSession,
    endSessionPending: completeMutation.isPending,
    extendSession: extendMutation.mutateAsync,
    extendSessionPending: extendMutation.isPending,
    endedAt,
    endReason,
    endedPatientId,
    markExternalJoinComplete,
    onEncounterReady,
  };
}
