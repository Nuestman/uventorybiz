import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AuthUser } from "@/types/auth";

const MFA_CODE_LENGTH = 6;

type MfaAuthPanelProps = {
  mode: "verify" | "setup";
  challengeToken?: string;
  setupToken?: string;
  onCancel?: () => void;
  onComplete: (data: { user: AuthUser; redirectTo?: string | null }) => void;
};

export default function MfaAuthPanel({ mode, challengeToken, setupToken, onCancel, onComplete }: MfaAuthPanelProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [setupStarted, setSetupStarted] = useState(mode === "verify");
  const codeInputRef = useRef<HTMLInputElement>(null);
  const submittedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (backupCodes || !setupStarted) return;
    const timer = window.setTimeout(() => codeInputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [backupCodes, setupStarted, mode]);

  const finishLogin = (data: { user: AuthUser; redirectTo?: string | null }) => {
    queryClient.setQueryData(["/api/auth/user"], data.user);
    onComplete(data);
  };

  const startSetupMutation = useMutation({
    mutationFn: async () => {
      if (setupToken) {
        const res = await apiRequest("POST", "/api/auth/mfa/setup-with-token", { setupToken });
        return res.json();
      }
      const res = await apiRequest("POST", "/api/auth/mfa/setup");
      return res.json();
    },
    onSuccess: (data: { otpauthUrl: string; secret: string }) => {
      setOtpauthUrl(data.otpauthUrl);
      setSecret(data.secret);
      setSetupStarted(true);
    },
    onError: (e: Error) => {
      toast({ title: "Setup failed", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const confirmSetupMutation = useMutation({
    mutationFn: async () => {
      if (setupToken) {
        const res = await apiRequest("POST", "/api/auth/mfa/setup-with-token/confirm", { setupToken, code });
        return res.json();
      }
      const res = await apiRequest("POST", "/api/auth/mfa/setup/confirm", { code });
      return res.json();
    },
    onSuccess: (data: { backupCodes?: string[]; user?: AuthUser; redirectTo?: string }) => {
      if (data.backupCodes) setBackupCodes(data.backupCodes);
      if (data.user) {
        toast({ title: "Two-factor enabled", description: "Your account is protected." });
        finishLogin({ user: data.user, redirectTo: data.redirectTo ?? null });
        return;
      }
      toast({ title: "Two-factor enabled", description: "Save your backup codes in a safe place." });
    },
    onError: (e: Error) => {
      submittedCodeRef.current = null;
      setCode("");
      toast({ title: "Verification failed", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const verifyLoginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/mfa/verify-login", { challengeToken, code });
      return res.json();
    },
    onSuccess: (data: { user: AuthUser; redirectTo?: string }) => {
      toast({ title: "Signed in", description: "Welcome back." });
      finishLogin(data);
    },
    onError: (e: Error) => {
      submittedCodeRef.current = null;
      setCode("");
      toast({ title: "Invalid code", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const isSubmitting =
    verifyLoginMutation.isPending || confirmSetupMutation.isPending || startSetupMutation.isPending;

  const canSubmit = code.length >= MFA_CODE_LENGTH && !isSubmitting;

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!canSubmit) return;
      if (mode === "verify") verifyLoginMutation.mutate();
      else confirmSetupMutation.mutate();
    },
    [canSubmit, mode, verifyLoginMutation, confirmSetupMutation],
  );

  useEffect(() => {
    if (backupCodes || !setupStarted || code.length !== MFA_CODE_LENGTH || isSubmitting) return;
    if (submittedCodeRef.current === code) return;
    submittedCodeRef.current = code;
    if (mode === "verify") verifyLoginMutation.mutate();
    else confirmSetupMutation.mutate();
  }, [backupCodes, setupStarted, code, isSubmitting, mode, verifyLoginMutation, confirmSetupMutation]);

  if (mode === "setup" && !setupStarted && !startSetupMutation.isPending) {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-white">
        <p className="text-sm text-muted-foreground">
          Your organization requires two-factor authentication. Set up an authenticator app to continue.
        </p>
        <Button className="w-full" onClick={() => startSetupMutation.mutate()}>
          Set up authenticator
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
            Back to sign in
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div>
        <h3 className="font-semibold text-gray-900">
          {mode === "verify" ? "Two-factor authentication" : "Set up authenticator app"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "verify"
            ? "Enter the 6-digit code from your authenticator app."
            : "Scan the QR code, then enter the code to confirm."}
        </p>
      </div>

      {mode === "setup" && otpauthUrl && (
        <div className="flex flex-col items-center gap-2 py-2">
          <QRCodeSVG value={otpauthUrl} size={160} />
          {secret && (
            <p className="text-xs text-muted-foreground break-all text-center">
              Manual key: <span className="font-mono">{secret}</span>
            </p>
          )}
        </div>
      )}

      {backupCodes && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm">
          <p className="font-medium text-amber-900 mb-2">Save these backup codes</p>
          <ul className="font-mono text-xs grid grid-cols-2 gap-1">
            {backupCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {!backupCodes && (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Authentication code</Label>
            <Input
              ref={codeInputRef}
              id="mfa-code"
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
            className="w-full bg-uventorybiz-navy hover:bg-uventorybiz-navy/90"
            disabled={!canSubmit}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "verify" ? "Verify and sign in" : "Confirm and enable"}
          </Button>
        </form>
      )}

      {onCancel && (
        <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
          Back to sign in
        </Button>
      )}
    </div>
  );
}
