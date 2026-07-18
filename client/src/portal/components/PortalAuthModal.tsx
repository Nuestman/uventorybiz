import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Loader2, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PORTAL_DASHBOARD } from "../portalRoutes";
import { PORTAL_SESSION_QUERY_KEY } from "../usePortalSession";

type AuthTab = "signin" | "access";

type TenantCard = {
  tenantId: string;
  name: string;
  appName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  supportEmail: string | null;
};

type PortalAuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: AuthTab;
  orgSlug?: string;
  errorCode?: string;
};

export function PortalAuthModal({
  open,
  onOpenChange,
  initialTab = "signin",
  orgSlug = "",
  errorCode = "",
}: PortalAuthModalProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [signInError, setSignInError] = useState("");
  const [accessError, setAccessError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const accessEmailRef = useRef<HTMLInputElement>(null);
  const [accessEmail, setAccessEmail] = useState("");
  const [accessSubmitted, setAccessSubmitted] = useState(false);
  const [linkFeedback, setLinkFeedback] = useState("");
  const [linkFeedbackStatus, setLinkFeedbackStatus] = useState("");
  const [accessFeedback, setAccessFeedback] = useState("");

  const slug = orgSlug.trim();

  const { data: tenantCard } = useQuery<TenantCard | null>({
    queryKey: ["/api/portal/public/tenant", slug],
    queryFn: async () => {
      if (!slug || slug.length < 2) return null;
      const res = await fetch(`/api/portal/public/tenant/${encodeURIComponent(slug)}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load organization");
      return res.json();
    },
    enabled: slug.length >= 2,
    retry: false,
  });

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  /** Browser autofill does not always fire onChange — sync into state when the modal opens. */
  useEffect(() => {
    if (!open) return;
    const syncAutofill = () => {
      const autofilledEmail = emailRef.current?.value.trim();
      if (autofilledEmail && autofilledEmail !== email) {
        setEmail(autofilledEmail);
      }
      const autofilledAccess = accessEmailRef.current?.value.trim();
      if (autofilledAccess && autofilledAccess !== accessEmail) {
        setAccessEmail(autofilledAccess);
      }
    };
    syncAutofill();
    const t1 = window.setTimeout(syncAutofill, 100);
    const t2 = window.setTimeout(syncAutofill, 500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open, tab]);

  useEffect(() => {
    if (errorCode === "invalid") {
      toast({
        title: "Sign-in link expired",
        description: "Request a new link below or sign in with your password.",
        variant: "destructive",
      });
    } else if (errorCode === "locked") {
      toast({
        title: "Account locked",
        description: "Contact your organization for assistance.",
        variant: "destructive",
      });
    } else if (errorCode === "suspended") {
      toast({
        title: "Portal access suspended",
        description: "Contact your organization to restore access.",
        variant: "destructive",
      });
    }
  }, [errorCode, toast]);

  const primary = tenantCard?.primaryColor?.trim() || "#0a4f6e";
  const brandName = tenantCard?.appName?.trim() || tenantCard?.name || "uventorybiz";

  const magicLinkMutation = useMutation({
    mutationFn: async (emailToSend: string) => {
      const body: Record<string, string> = { email: emailToSend };
      if (slug) body.slug = slug;
      const res = await apiRequest("POST", "/api/portal/auth/magic-link", body);
      return res.json() as Promise<{ message?: string; emailSent?: boolean; status?: string }>;
    },
    onSuccess: (data) => {
      setLinkSent(true);
      setSignInError("");
      const message = data.message || "Check your email for a sign-in link.";
      setLinkFeedback(message);
      setLinkFeedbackStatus(data.status || "");
      const title =
        data.status === "portal_active"
          ? "Sign-in link sent"
          : data.status === "record_no_account"
            ? "No portal account yet"
            : data.status === "not_found"
              ? "Email not found"
              : data.status === "portal_suspended"
                ? "Account suspended"
                : data.status === "portal_locked"
                  ? "Account locked"
                  : "Check your email";
      toast({
        title,
        description: message,
        variant:
          data.status === "portal_active" && data.emailSent !== false
            ? "default"
            : data.status === "not_found" ||
                data.status === "record_no_account" ||
                data.status === "portal_suspended" ||
                data.status === "portal_locked"
              ? "destructive"
              : "default",
      });
    },
    onError: (e: Error) => {
      const message = e.message.replace(/^\d+:\s*/, "") || "Try again.";
      setSignInError(message);
      toast({
        title: "Could not send sign-in link",
        description: message,
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ emailToSend, passwordToSend }: { emailToSend: string; passwordToSend: string }) => {
      const body: Record<string, string> = { email: emailToSend, password: passwordToSend };
      if (slug) body.slug = slug;
      else throw new Error("Use your organization's personalized portal link for password sign-in.");
      await apiRequest("POST", "/api/portal/auth/login", body);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PORTAL_SESSION_QUERY_KEY });
      setSignInError("");
      toast({ title: "Signed in", description: "Welcome to your portal." });
      onOpenChange(false);
      setLocation(PORTAL_DASHBOARD);
    },
    onError: (e: Error) => {
      const message = e.message.replace(/^\d+:\s*/, "") || "Check your details and try again.";
      setSignInError(message);
      toast({
        title: "Sign in failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const accessMutation = useMutation({
    mutationFn: async (emailToSend: string) => {
      const body: Record<string, string> = { email: emailToSend };
      if (slug) body.slug = slug;
      const res = await apiRequest("POST", "/api/portal/public/access-request", body);
      return res.json() as Promise<{ message?: string; status?: string }>;
    },
    onSuccess: (data) => {
      setAccessSubmitted(true);
      setAccessError("");
      setAccessFeedback(data.message || "Your organization will review your request and contact you.");
      toast({
        title: "Request submitted",
        description: data.message || accessFeedback,
      });
    },
    onError: (e: Error) => {
      const message = e.message.replace(/^\d+:\s*/, "") || "Try again later.";
      setAccessError(message);
      toast({
        title: "Could not submit request",
        description: message,
        variant: "destructive",
      });
    },
  });

  const isPending = magicLinkMutation.isPending || loginMutation.isPending || accessMutation.isPending;

  const resolveSignInEmail = () => (emailRef.current?.value ?? email).trim();

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const emailValue = resolveSignInEmail();
    setEmail(emailValue);

    if (!isValidEmail(emailValue)) {
      const message = "Enter a valid email address.";
      setSignInError(message);
      toast({ title: "Email required", description: message, variant: "destructive" });
      return;
    }

    if (showPasswordLogin) {
      const passwordValue = passwordRef.current?.value ?? password;
      setPassword(passwordValue);
      if (!passwordValue) {
        const message = "Enter your password.";
        setSignInError(message);
        toast({ title: "Password required", description: message, variant: "destructive" });
        return;
      }
      loginMutation.mutate({ emailToSend: emailValue, passwordToSend: passwordValue });
      return;
    }

    setSignInError("");
    magicLinkMutation.mutate(emailValue);
  };

  const handleAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailValue = (accessEmailRef.current?.value ?? accessEmail).trim();
    setAccessEmail(emailValue);

    if (!isValidEmail(emailValue)) {
      const message = "Enter a valid email address.";
      setAccessError(message);
      toast({ title: "Email required", description: message, variant: "destructive" });
      return;
    }

    setAccessError("");
    accessMutation.mutate(emailValue);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="portal-root portal-ui max-w-md border-0 bg-transparent p-0 shadow-none sm:max-w-md [&>button]:hidden">
        <DialogTitle className="sr-only">{tab === "signin" ? "Sign in to portal" : "Request portal access"}</DialogTitle>
        <DialogDescription className="sr-only">
          {tab === "signin"
            ? "Request a magic sign-in link or sign in with your password."
            : "Submit a request for your organization to activate portal access."}
        </DialogDescription>
        <div className="portal-modal-shell">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              {tenantCard?.logoUrl ? (
                <img src={tenantCard.logoUrl} alt="" className="h-9 w-9 object-contain rounded-lg" />
              ) : (
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: primary }}
                >
                  {brandName.charAt(0)}
                </div>
              )}
              <span className="font-semibold text-gray-900 truncate">{brandName}</span>
            </div>
          </div>

          <div className="px-6 pt-4">
            <div className="portal-auth-tabs">
              <button
                type="button"
                className="portal-auth-tab"
                data-active={tab === "signin" ? "true" : "false"}
                onClick={() => {
                  setTab("signin");
                  setSignInError("");
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                className="portal-auth-tab"
                data-active={tab === "access" ? "true" : "false"}
                onClick={() => {
                  setTab("access");
                  setAccessError("");
                }}
              >
                Request access
              </button>
            </div>
          </div>

          {tab === "signin" ? (
            <form onSubmit={handleSignIn} className="px-6 py-5 space-y-4">
              <p className="text-sm text-[var(--portal-muted)]">
                Enter the email address associated with your account. We&apos;ll send you a secure sign-in link.
              </p>

              <div className="space-y-2">
                <Label htmlFor="portal-auth-email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    ref={emailRef}
                    id="portal-auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="portal-input-field pl-10"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setLinkSent(false);
                      setLinkFeedback("");
                      setLinkFeedbackStatus("");
                      setSignInError("");
                    }}
                    onInput={(e) => {
                      setEmail(e.currentTarget.value);
                      setLinkSent(false);
                      setLinkFeedback("");
                      setLinkFeedbackStatus("");
                      setSignInError("");
                    }}
                  />
                </div>
              </div>

              {showPasswordLogin ? (
                <div className="space-y-2">
                  <Label htmlFor="portal-auth-password">Password</Label>
                  <Input
                    ref={passwordRef}
                    id="portal-auth-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="portal-input-field"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setSignInError("");
                    }}
                  />
                </div>
              ) : null}

              {signInError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {signInError}
                </p>
              ) : null}

              {linkSent && linkFeedback && !showPasswordLogin ? (
                <p
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    linkFeedbackStatus === "portal_active"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-amber-200 bg-amber-50 text-amber-950"
                  }`}
                  role="status"
                >
                  {linkFeedback}
                </p>
              ) : null}

              {!showPasswordLogin ? (
                <button
                  type="submit"
                  className="portal-btn-primary w-full"
                  style={{ backgroundColor: primary }}
                  disabled={isPending}
                >
                  {magicLinkMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending link…
                    </>
                  ) : linkSent ? (
                    "Resend magic link"
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send magic link
                    </>
                  )}
                </button>
              ) : (
                <button type="submit" className="portal-btn-outline w-full" disabled={isPending}>
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in with password"
                  )}
                </button>
              )}

              <p className="text-xs text-center text-[var(--portal-muted)]">No password needed. One link, one sign-in.</p>

              <button
                type="button"
                className="w-full text-xs text-[var(--portal-teal)] underline"
                onClick={() => setShowPasswordLogin((v) => !v)}
              >
                {showPasswordLogin ? "Use magic link instead" : "Sign in with password instead"}
              </button>

              <p className="text-xs text-center text-[var(--portal-muted)] pt-2 border-t">
                Staff member?{" "}
                <Link href="/auth" className="font-medium text-[var(--portal-teal)] hover:underline">
                  Sign in to uventorybiz
                </Link>
              </p>
            </form>
          ) : accessSubmitted ? (
            <div className="px-6 py-8 text-center space-y-3">
              <p className="font-medium text-gray-900">Request received</p>
              <p className="text-sm text-[var(--portal-muted)]">
                {accessFeedback || "We've notified your clinic. They will contact you when your portal access is ready."}
              </p>
              <button type="button" className="portal-btn-outline" onClick={() => onOpenChange(false)}>
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleAccessSubmit} className="px-6 py-5 space-y-4">
              <p className="text-sm text-[var(--portal-muted)]">
                Enter your email address. We&apos;ll check for an existing portal account and notify your organization if you
                need help accessing the portal.
              </p>

              <div className="space-y-2">
                <Label htmlFor="access-email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    ref={accessEmailRef}
                    id="access-email"
                    name="access-email"
                    type="email"
                    autoComplete="email"
                    className="portal-input-field pl-10"
                    value={accessEmail}
                    onChange={(e) => {
                      setAccessEmail(e.target.value);
                      setAccessError("");
                    }}
                    onInput={(e) => {
                      setAccessEmail(e.currentTarget.value);
                      setAccessError("");
                    }}
                  />
                </div>
              </div>

              {accessError ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {accessError}
                </p>
              ) : null}

              <button
                type="submit"
                className="portal-btn-primary w-full"
                style={{ backgroundColor: primary }}
                disabled={isPending}
              >
                {accessMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Request access"
                )}
              </button>

              <p className="text-xs text-center text-[var(--portal-muted)]">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-[var(--portal-teal)] underline"
                  onClick={() => {
                    setTab("signin");
                    setAccessError("");
                  }}
                >
                  Sign in with magic link
                </button>
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function usePortalAuthModalFromUrl() {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const signin = params.get("signin") === "1";
  const access = params.get("access") === "1";
  const org = params.get("org") || "";
  const error = params.get("error") || "";
  return {
    shouldOpen: signin || access,
    initialTab: access ? ("access" as const) : ("signin" as const),
    org,
    error,
    clearUrlParams: () => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      url.searchParams.delete("signin");
      url.searchParams.delete("access");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    },
  };
}
