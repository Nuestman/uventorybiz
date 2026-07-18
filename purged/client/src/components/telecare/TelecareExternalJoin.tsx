import { useMutation } from "@tanstack/react-query";
import { ExternalLink, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TelecareAudience } from "@shared/telecare";

type TelecareExternalJoinProps = {
  sessionId: string;
  audience: TelecareAudience;
  scheduledLabel?: string;
  primaryColor?: string;
  onJoined?: () => void;
};

export default function TelecareExternalJoin({
  sessionId,
  audience,
  scheduledLabel,
  primaryColor = "#142F5C",
  onJoined,
}: TelecareExternalJoinProps) {
  const { toast } = useToast();
  const joinPath =
    audience === "portal"
      ? `/api/portal/telecare/sessions/${sessionId}/join`
      : `/api/telecare/sessions/${sessionId}/join`;

  const join = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", joinPath);
      return (await res.json()) as { joinUrl?: string };
    },
    onSuccess: (data) => {
      if (!data.joinUrl) {
        toast({
          title: "Unable to open visit",
          description: "The meeting link is not ready yet.",
          variant: "destructive",
        });
        return;
      }
      window.open(data.joinUrl, "_blank", "noopener,noreferrer");
      onJoined?.();
      toast({
        title: "Opening Microsoft Teams",
        description: "Your visit should open in a new tab.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unable to join visit",
        description: error.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="border-gray-200 shadow-sm overflow-hidden max-w-lg">
      <div className="h-1.5" style={{ backgroundColor: primaryColor }} />
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
          <Video className="h-5 w-5 text-mineaid-navy" />
          Microsoft Teams visit
        </CardTitle>
        <CardDescription className="text-mineaid-gray">
          This visit uses Microsoft Teams. You will join in a new browser tab.
        </CardDescription>
        {scheduledLabel ? <p className="text-sm text-mineaid-gray pt-1">{scheduledLabel}</p> : null}
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          className="w-full bg-mineaid-navy text-white hover:bg-mineaid-navy/90"
          disabled={join.isPending}
          onClick={() => join.mutate()}
        >
          {join.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting…
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Teams visit
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
