import { CheckCircle2, FileText, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TelecareAudience } from "@shared/telecare";
import type { TelecareEndReason } from "./TelecareInCallShell";

type TelecareSessionEndedProps = {
  audience: TelecareAudience;
  backHref: string;
  endedAt?: Date | null;
  endReason?: TelecareEndReason;
  primaryColor?: string;
  /** Staff only: link to full encounter workflow (documentation, disposition, discharge). */
  workflowHref?: string | null;
  /** Optional follow-up secure messaging link (staff or portal). */
  messagingHref?: string | null;
};

function endDescription(reason: TelecareEndReason | undefined, endedAt?: Date | null): string {
  const timeLabel = endedAt
    ? `Disconnected at ${endedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}.`
    : "";
  switch (reason) {
    case "scheduled":
      return `The scheduled appointment time ended and the visit was closed for everyone. ${timeLabel}`.trim();
    case "remote":
      return `The visit was ended by the other participant or the clinic. ${timeLabel}`.trim();
    case "user":
    default:
      return timeLabel || "The video visit has ended for everyone.";
  }
}

export default function TelecareSessionEnded({
  audience,
  backHref,
  endedAt,
  endReason = "user",
  primaryColor = "#142F5C",
  workflowHref,
  messagingHref,
}: TelecareSessionEndedProps) {
  const showWorkflow = audience === "staff" && !!workflowHref;
  const showMessaging = !!messagingHref;

  return (
    <Card className="max-w-lg mx-auto border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: primaryColor }} />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Visit ended
        </CardTitle>
        <CardDescription>
          {endDescription(endReason, endedAt)}
          {showWorkflow ? (
            <span className="block mt-2">
              Continue in the encounter workflow to finalize documentation, disposition, and discharge.
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {showMessaging ? (
          <Link href={messagingHref}>
            <Button variant="outline" className="w-full">
              <MessageSquare className="h-4 w-4 mr-2" />
              Send a follow-up message
            </Button>
          </Link>
        ) : null}
        {showWorkflow ? (
          <Link href={workflowHref}>
            <Button className="w-full bg-mineaid-navy hover:bg-mineaid-navy/90">
              <FileText className="h-4 w-4 mr-2" />
              Open workflow
            </Button>
          </Link>
        ) : null}
        <Link href={backHref}>
          <Button
            variant={showWorkflow ? "outline" : "default"}
            className={showWorkflow ? "w-full" : "w-full bg-mineaid-navy hover:bg-mineaid-navy/90"}
          >
            {audience === "portal" ? "Back to appointments" : "Back to telehealth queue"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
