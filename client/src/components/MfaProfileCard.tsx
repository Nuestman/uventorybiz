import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MFA_CODE_LENGTH = 6;

export default function MfaProfileCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const enrollCodeRef = useRef<HTMLInputElement>(null);
  const submittedEnrollCodeRef = useRef<string | null>(null);
  const submittedDisableCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enrolling || !otpauthUrl) return;
    const timer = window.setTimeout(() => enrollCodeRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [enrolling, otpauthUrl]);

  const { data: status, isLoading } = useQuery<{ mfaEnabled: boolean; tenantRequiresMfa: boolean }>({
    queryKey: ["/api/auth/mfa/status"],
  });

  const beginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/mfa/setup");
      return res.json() as Promise<{ otpauthUrl: string; secret: string }>;
    },
    onSuccess: (data) => {
      setOtpauthUrl(data.otpauthUrl);
      setEnrolling(true);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/mfa/setup/confirm", { code });
      return res.json() as Promise<{ backupCodes: string[] }>;
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setEnrolling(false);
      setOtpauthUrl(null);
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/mfa/status"] });
      toast({ title: "Two-factor authentication enabled" });
    },
    onError: (e: Error) => {
      submittedEnrollCodeRef.current = null;
      setCode("");
      toast({ title: "Verification failed", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/mfa/disable", { password: disablePassword, code });
    },
    onSuccess: () => {
      setDisablePassword("");
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/mfa/status"] });
      toast({ title: "Two-factor authentication disabled" });
    },
    onError: (e: Error) => {
      submittedDisableCodeRef.current = null;
      setCode("");
      toast({ title: "Could not disable MFA", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  useEffect(() => {
    if (!enrolling || code.length !== MFA_CODE_LENGTH || confirmMutation.isPending) return;
    if (submittedEnrollCodeRef.current === code) return;
    submittedEnrollCodeRef.current = code;
    confirmMutation.mutate();
  }, [enrolling, code, confirmMutation.isPending, confirmMutation]);

  useEffect(() => {
    if (code.length !== MFA_CODE_LENGTH || disableMutation.isPending || !disablePassword) return;
    if (submittedDisableCodeRef.current === code) return;
    submittedDisableCodeRef.current = code;
    disableMutation.mutate();
    // Only auto-submit when the 6th OTP digit is entered; password must already be filled.
  }, [code, disableMutation.isPending, disableMutation]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-factor authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security with an authenticator app.
          {status?.tenantRequiresMfa ? " Required by your organization." : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Authenticator app</p>
            <p className="text-xs text-muted-foreground">
              {status?.mfaEnabled ? "Enabled" : "Not configured"}
            </p>
          </div>
          <Switch checked={!!status?.mfaEnabled} disabled aria-label="MFA status" />
        </div>

        {backupCodes && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
            <p className="font-medium mb-2">Backup codes (store safely)</p>
            <ul className="font-mono text-xs grid grid-cols-2 gap-1">
              {backupCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {!status?.mfaEnabled && !enrolling && (
          <Button onClick={() => beginMutation.mutate()} disabled={beginMutation.isPending}>
            {beginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Set up authenticator
          </Button>
        )}

        {enrolling && otpauthUrl && (
          <form
            className="space-y-3 border rounded-lg p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length < 6 || confirmMutation.isPending) return;
              confirmMutation.mutate();
            }}
          >
            <div className="flex justify-center">
              <QRCodeSVG value={otpauthUrl} size={160} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mfa-enroll-code">Verification code</Label>
              <Input
                ref={enrollCodeRef}
                id="mfa-enroll-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={MFA_CODE_LENGTH}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, MFA_CODE_LENGTH))}
                placeholder="000000"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={code.length < MFA_CODE_LENGTH || confirmMutation.isPending}
            >
              {confirmMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm setup
            </Button>
          </form>
        )}

        {status?.mfaEnabled && !status.tenantRequiresMfa && (
          <form
            className="space-y-3 border-t pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!disablePassword || code.length < 6 || disableMutation.isPending) return;
              disableMutation.mutate();
            }}
          >
            <p className="text-sm font-medium">Disable two-factor authentication</p>
            <div className="space-y-2">
              <Label htmlFor="mfa-disable-password">Current password</Label>
              <Input
                id="mfa-disable-password"
                type="password"
                autoComplete="current-password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mfa-disable-code">Authentication code</Label>
              <Input
                id="mfa-disable-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={MFA_CODE_LENGTH}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, MFA_CODE_LENGTH))}
                placeholder="000000"
              />
            </div>
            <Button
              type="submit"
              variant="destructive"
              disabled={!disablePassword || code.length < MFA_CODE_LENGTH || disableMutation.isPending}
            >
              Disable MFA
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
