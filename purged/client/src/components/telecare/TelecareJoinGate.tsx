import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TelecareAudience } from "@shared/telecare";

type TelecareJoinGateProps = {
  audience: TelecareAudience;
  message: string;
  backHref: string;
  primaryColor?: string;
};

export default function TelecareJoinGate({
  audience,
  message,
  backHref,
  primaryColor = "#142F5C",
}: TelecareJoinGateProps) {
  return (
    <Card className="max-w-lg mx-auto border-gray-200 shadow-sm overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: primaryColor }} />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          Unable to join visit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>{audience === "portal" ? "Visit not available" : "Session unavailable"}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Link href={backHref}>
          <Button variant="outline" className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {audience === "portal" ? "Back to appointments" : "Back to telehealth queue"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
