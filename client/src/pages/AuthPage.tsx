import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { offlineStore } from "@/lib/offlineStore";
import type { AuthUser } from "@/types/auth";
import { Loader2, Mail, Phone, User, Lock, Shield, Building2, UserPlus, ArrowLeft, WifiOff } from "lucide-react";
import { FaGoogle, FaMicrosoft } from "react-icons/fa6";
import TenantRegistration from "./TenantRegistration";
import { Link } from "wouter";
import { getPostLoginHome } from "@/routes";
import MfaAuthPanel from "@/components/MfaAuthPanel";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";

import { BrandLogo } from "@/components/BrandLogo";

// Schemas matching the server-side validation
const registerSchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().min(10).optional(),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  employeeNumber: z.string().optional(), // Employee number for your record (required when creating new org)
  organizationId: z.string().optional(), // Optional organization ID for joining existing org
  password: z.string().min(8, "Password must be at least 8 characters"),
  acceptTermsAndPrivacy: z.boolean().refine((v) => v === true, {
    message: "You must accept the Terms of Service and Privacy Policy",
  }),
}).refine(data => data.email || data.phoneNumber, {
  message: "Either email or phone number is required"
});

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
});

type RegisterFormData = z.infer<typeof registerSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Match login identifier to cached user (email or phone) for offline resume. */
function identifierMatchesCached(identifier: string, user: AuthUser): boolean {
  const raw = identifier.trim();
  if (!raw) return false;
  const email = user.email?.trim().toLowerCase();
  if (email && raw.toLowerCase() === email) return true;
  const phoneDigits = user.phone ? digitsOnly(user.phone) : "";
  const idDigits = digitsOnly(raw);
  if (phoneDigits.length >= 7 && idDigits.length >= 7 && phoneDigits === idDigits) return true;
  return false;
}

function getPostLoginPath(user: AuthUser, serverRedirect?: string | null): string {
  const urlParams = new URLSearchParams(window.location.search);
  const returnTo = urlParams.get("returnTo");
  const safeReturn =
    returnTo &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//") &&
    !returnTo.startsWith("/auth");
  if (safeReturn) return returnTo;

  const home = getPostLoginHome(user);

  // Platform super admins must never be sent to the tenant dashboard by a stale/wrong server hint
  if (user?.role === "super_admin" && !user?.tenantId) return home;

  if (serverRedirect?.startsWith("/") && !serverRedirect.startsWith("//")) {
    return serverRedirect;
  }

  return home;
}

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [registrationStep, setRegistrationStep] = useState<"choose" | "tenant" | "user">("choose");
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const { toast } = useToast();
  const isOnline = useOnlineStatus();
  const [cachedOfflineUser, setCachedOfflineUser] = useState<AuthUser | null>(null);
  const { user: sessionUser, isLoading: sessionUserLoading } = useAuth();
  const [mfaMode, setMfaMode] = useState<"none" | "verify" | "setup">("none");
  const [mfaChallengeToken, setMfaChallengeToken] = useState("");
  const [mfaSetupToken, setMfaSetupToken] = useState("");

  useEffect(() => {
    if (sessionUserLoading) return;
    if (!sessionUser) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("mode") === "reset") return;
    window.location.replace(getPostLoginPath(sessionUser, null));
  }, [sessionUserLoading, sessionUser]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await offlineStore.getMeta<AuthUser>("authUser");
        if (!cancelled && stored) setCachedOfflineUser(stored);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (!err || !err.startsWith("oidc_")) return;
    const messages: Record<string, string> = {
      oidc_no_account:
        "No uventorybiz account matches this sign-in. Ask your administrator to invite you or use email and password if you already have access.",
      oidc_account_conflict: "This account is already linked to a different sign-in method.",
      oidc_inactive: "Your account is not active yet, or access is suspended.",
      oidc_invalid_domain: "Your email domain is not allowed for this sign-in method.",
      oidc_no_email: "The identity provider did not return an email address we can use.",
      oidc_tenant_inactive: "Your organization is not active. Please contact support.",
      oidc_denied: "Sign-in was cancelled.",
      oidc_failed: "Sign-in could not be completed. Try again or use email and password.",
      oidc_not_configured: "This sign-in method is not configured on the server.",
      oidc_session_expired: "Your sign-in session expired. Please try again.",
      oidc_invalid_token: "Could not validate the sign-in token. Please try again.",
    };
    toast({
      title: "Sign-in with Google / Microsoft",
      description: messages[err] ?? "Sign-in could not be completed.",
      variant: "destructive",
    });
    params.delete("error");
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
  }, [toast]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const challenge = params.get("mfaChallenge");
    const setup = params.get("mfaSetup");
    if (challenge) {
      setMfaMode("verify");
      setMfaChallengeToken(challenge);
      setActiveTab("login");
    } else if (setup) {
      setMfaMode("setup");
      setMfaSetupToken(setup);
      setActiveTab("login");
    }
    if (challenge || setup) {
      params.delete("mfaChallenge");
      params.delete("mfaSetup");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
  }, []);

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      employeeNumber: "",
      organizationId: "",
      password: "",
      acceptTermsAndPrivacy: false,
    },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  // Handle URL parameters for account confirmation and password reset
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const message = urlParams.get('message');
    const email = urlParams.get('email');

    if (mode === 'reset' && message === 'account-confirmed') {
      toast({
        title: "Account Confirmed!",
        description: "Your account has been successfully activated. You can now log in with your credentials.",
        variant: "default",
      });
      
      // Pre-fill email if provided
      if (email) {
        loginForm.setValue('identifier', decodeURIComponent(email));
      }
      
      setActiveTab("login");
      setRegistrationStep("choose");
      
      // Clean up URL
      window.history.replaceState({}, document.title, '/auth');
    }
  }, [toast, loginForm]);

  // Reset registration flow when switching between tabs
  useEffect(() => {
    if (activeTab === "login") {
      setRegistrationStep("choose");
      setSelectedTenant(null);
    }
  }, [activeTab]);

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData & { tenantId?: string }) => {
      if (!isOnline) {
        throw new Error(
          "Registration requires an internet connection. Connect and try again.",
        );
      }
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registration Successful",
        description: data.message || "Account created successfully. Please check your email for verification.",
      });
      setActiveTab("login");
      setRegistrationStep("choose");
      setSelectedTenant(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresMfa && data.mfaChallengeToken) {
        setMfaMode("verify");
        setMfaChallengeToken(data.mfaChallengeToken);
        toast({ title: "Enter authentication code", description: "Open your authenticator app to continue." });
        return;
      }
      if (data.requiresMfaSetup && data.setupToken) {
        setMfaMode("setup");
        setMfaSetupToken(data.setupToken);
        toast({
          title: "Two-factor setup required",
          description: "Your organization requires an authenticator app before you can sign in.",
        });
        return;
      }
      toast({
        title: "Login Successful",
        description: "Welcome to uventorybiz",
      });
      queryClient.setQueryData(["/api/auth/user"], data.user);
      window.location.href = getPostLoginPath(data.user, data.redirectTo ?? null);
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onRegister = (data: RegisterFormData) => {
    if (!isOnline) {
      toast({
        title: "No connection",
        description: "Registration requires the internet. Try again when you are online.",
        variant: "destructive",
      });
      return;
    }
    // For existing tenant registration, use organizationId as tenantId
    // For new tenant registration, use selectedTenant.id
    const tenantId = selectedTenant?.id || data.organizationId;
    
    if (!tenantId) {
      toast({
        title: "Tenant Required",
        description: "Please select or create a tenant, or provide an organization ID before registering.",
        variant: "destructive",
      });
      return;
    }
    
    registerMutation.mutate({
      ...data,
      tenantId: tenantId,
      // Remove organizationId from the request as it's now used as tenantId
      organizationId: undefined,
    });
  };

  const navigateAfterAuth = (user: AuthUser) => {
    window.location.href = getPostLoginPath(user);
  };

  const continueOffline = () => {
    if (!cachedOfflineUser) return;
    queryClient.setQueryData(["/api/auth/user"], cachedOfflineUser);
    toast({
      title: "Working offline",
      description: "Using your saved session on this device until you reconnect.",
    });
    navigateAfterAuth(cachedOfflineUser);
  };

  const onLogin = (data: LoginFormData) => {
    if (!isOnline) {
      if (cachedOfflineUser && identifierMatchesCached(data.identifier, cachedOfflineUser)) {
        queryClient.setQueryData(["/api/auth/user"], cachedOfflineUser);
        toast({
          title: "Working offline",
          description: "Using your saved session on this device.",
        });
        navigateAfterAuth(cachedOfflineUser);
        return;
      }
      toast({
        title: "Can’t verify sign-in without a connection",
        description: cachedOfflineUser
          ? "Use the same email or phone as your last session on this device, or tap Continue with saved session below."
          : "Sign in once while online on this device. After that, you can open the app offline with your saved session.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(data);
  };

  const handleTenantCreated = (tenantData: any) => {
    // Extract tenant from response - API returns { tenant: {...} }
    // TenantRegistration now extracts it, but handle both cases for safety
    const tenant = tenantData.tenant || tenantData;
    setSelectedTenant(tenant);
    setRegistrationStep("user");
  };

  const handleRegistrationChoice = (choice: "new" | "existing") => {
    if (choice === "new") {
      setRegistrationStep("tenant");
    } else {
      setRegistrationStep("user");
    }
  };

  // Show tenant registration step
  if (activeTab === "register" && registrationStep === "tenant") {
    return (
      <TenantRegistration 
        onComplete={handleTenantCreated}
        onBack={() => setRegistrationStep("choose")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-uventorybiz-light via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-screen">
            
            {/* Left Column - Auth Forms */}
            <div className="space-y-8">
              <div className="text-center lg:text-left">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {activeTab === "login" ? "Welcome Back" : 
                   (registrationStep === "choose" ? "Join uventorybiz" : 
                    selectedTenant ? `Join ${selectedTenant.name}` : "Create Account")
                  }
                </h1>
                <p className="text-uventorybiz-gray">
                  {activeTab === "login" 
                    ? "Sign in to access your business management dashboard" 
                    : registrationStep === "choose" 
                      ? "Choose how you'd like to get started"
                      : "Create your account to get started with inventory, POS, and operations management"
                  }
                </p>
              </div>

              <Card className="w-full max-w-md mx-auto lg:mx-0">
                <CardHeader className="space-y-1">
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "login" | "register")}>
                    <div className="tabs-list-custom mb-6">
                      <TabsList className="grid w-full grid-cols-2 bg-transparent h-auto p-1 gap-1 lg:gap-2">
                        <TabsTrigger value="login" className="tab-trigger-custom text-xs sm:text-sm">Sign In</TabsTrigger>
                        <TabsTrigger value="register" className="tab-trigger-custom text-xs sm:text-sm">Register</TabsTrigger>
                      </TabsList>
                    </div>
                    
                    <TabsContent value="login" className="space-y-4">
                      {mfaMode !== "none" ? (
                        <MfaAuthPanel
                          mode={mfaMode === "verify" ? "verify" : "setup"}
                          challengeToken={mfaChallengeToken}
                          setupToken={mfaSetupToken}
                          onCancel={() => {
                            setMfaMode("none");
                            setMfaChallengeToken("");
                            setMfaSetupToken("");
                          }}
                          onComplete={(data) => {
                            window.location.href = getPostLoginPath(data.user, data.redirectTo ?? null);
                          }}
                        />
                      ) : (
                        <>
                      <CardTitle className="text-center text-lg">Sign in to your account</CardTitle>
                      {!isOnline && cachedOfflineUser && (
                        <Alert className="border-amber-200 bg-amber-50 text-amber-950">
                          <WifiOff className="h-4 w-4 text-amber-800" />
                          <AlertTitle className="text-amber-900">You are offline</AlertTitle>
                          <AlertDescription className="text-amber-900/90 space-y-3">
                            <p>
                              Password sign-in needs the server. You can continue with the account that last signed in on this browser.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full border-amber-300 bg-white hover:bg-amber-100"
                              onClick={continueOffline}
                            >
                              Continue with saved session
                              {cachedOfflineUser.firstName || cachedOfflineUser.lastName
                                ? ` (${[cachedOfflineUser.firstName, cachedOfflineUser.lastName].filter(Boolean).join(" ")})`
                                : ""}
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}
                      {!isOnline && !cachedOfflineUser && (
                        <Alert variant="destructive">
                          <WifiOff className="h-4 w-4" />
                          <AlertTitle>No saved session on this device</AlertTitle>
                          <AlertDescription>
                            Connect to the internet once to sign in. Offline mode is available after that.
                          </AlertDescription>
                        </Alert>
                      )}
                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="identifier">Email or Phone Number</Label>
                          <div className="relative">
                            <Input
                              {...loginForm.register("identifier")}
                              id="identifier"
                              placeholder="Enter your email or phone"
                              className="pl-10"
                            />
                            <User className="absolute left-3 top-3 h-4 w-4 text-uventorybiz-gray" />
                          </div>
                          {loginForm.formState.errors.identifier && (
                            <p className="text-sm text-red-600">{loginForm.formState.errors.identifier.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="password">Password</Label>
                            <button
                              type="button"
                              onClick={() => {
                                toast({
                                  title: "Password Reset",
                                  description: "Please contact your administrator to reset your password.",
                                });
                              }}
                              className="text-sm text-[#FF4D4D] hover:text-[#FF4D4D]/80 font-semibold hover:underline"
                            >
                              Forgot Password?
                            </button>
                          </div>
                          <div className="relative">
                            <Input
                              {...loginForm.register("password")}
                              id="password"
                              type="password"
                              placeholder="Enter your password"
                              className="pl-10"
                            />
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-uventorybiz-gray" />
                          </div>
                          {loginForm.formState.errors.password && (
                            <p className="text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
                          )}
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full bg-[#142F5C] hover:bg-[#142F5C]/90 text-white font-bold"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Sign In
                        </Button>
                      </form>

                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <Separator className="w-full" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase tracking-wide">
                          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-slate-200 bg-white hover:bg-slate-50 hover:text-uventorybiz-navy"
                          disabled={!isOnline}
                          onClick={() => {
                            window.location.href = "/api/auth/oidc/microsoft/start";
                          }}
                        >
                          <FaMicrosoft className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                          Continue with Microsoft
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-slate-200 bg-white hover:bg-slate-50 hover:text-uventorybiz-navy"
                          disabled={!isOnline}
                          onClick={() => {
                            window.location.href = "/api/auth/oidc/google/start";
                          }}
                        >
                          <FaGoogle className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                          Continue with Google
                        </Button>
                        {!isOnline && (
                          <p className="text-center text-xs text-muted-foreground">
                            Google and Microsoft sign-in require an internet connection.
                          </p>
                        )}
                      </div>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="register" className="space-y-4">
                      <CardTitle className="text-center text-lg">
                        {registrationStep === "choose" ? "How would you like to get started?" : "Create your account"}
                      </CardTitle>
                      
                      {registrationStep === "choose" ? (
                        <div className="space-y-4">
                          <Button
                            onClick={() => handleRegistrationChoice("new")}
                            className="w-full bg-[#142F5C] hover:bg-[#142F5C]/90 py-6"
                            variant="default"
                          >
                            <Building2 className="mr-3 h-5 w-5" />
                            <div className="text-left">
                              <div className="font-semibold">Create New Organization</div>
                              <div className="text-sm opacity-90">Set up a new company or business</div>
                            </div>
                          </Button>
                          
                          <Button
                            onClick={() => handleRegistrationChoice("existing")}
                            className="w-full bg-slate-100 text-uventorybiz-navy hover:bg-slate-50 hover:text-uventorybiz-navy py-6"
                            variant="outline"
                          >
                            <UserPlus className="mr-3 h-5 w-5" />
                            <div className="text-left">
                              <div className="font-semibold">Join Existing Organization</div>
                              <div className="text-sm opacity-90">I have an invitation or referral</div>
                            </div>
                          </Button>
                        </div>
                      ) : (
                        <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                              {...registerForm.register("firstName")}
                              id="firstName"
                              placeholder="John"
                            />
                            {registerForm.formState.errors.firstName && (
                              <p className="text-sm text-red-600">{registerForm.formState.errors.firstName.message}</p>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                              {...registerForm.register("lastName")}
                              id="lastName"
                              placeholder="Doe"
                            />
                            {registerForm.formState.errors.lastName && (
                              <p className="text-sm text-red-600">{registerForm.formState.errors.lastName.message}</p>
                            )}
                          </div>
                        </div>

                        {!selectedTenant && registrationStep === "user" && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="organizationId">Organization ID</Label>
                              <div className="relative">
                                <Input
                                  {...registerForm.register("organizationId")}
                                  id="organizationId"
                                  placeholder="Enter your organization ID or invitation code"
                                  className="pl-10"
                                />
                                <Building2 className="absolute left-3 top-3 h-4 w-4 text-uventorybiz-gray" />
                              </div>
                              {registerForm.formState.errors.organizationId && (
                                <p className="text-sm text-red-600">{registerForm.formState.errors.organizationId.message}</p>
                              )}
                              <p className="text-xs text-uventorybiz-gray">
                                Enter the organization ID provided by your company
                              </p>
                            </div>
                          </>
                        )}

                        <div className="space-y-2">
                          <Label htmlFor="employeeNumber">Employee number</Label>
                          <div className="relative">
                            <Input
                              {...registerForm.register("employeeNumber")}
                              id="employeeNumber"
                              placeholder="e.g. 300###, US0###, or your org's format"
                              className="pl-10"
                            />
                            <Shield className="absolute left-3 top-3 h-4 w-4 text-uventorybiz-gray" />
                          </div>
                          {registerForm.formState.errors.employeeNumber && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.employeeNumber.message}</p>
                          )}
                          <p className="text-xs text-uventorybiz-gray">
                            {selectedTenant
                              ? "Your employee number for this organization (used for your user record)."
                              : "When joining an existing org, enter your assigned employee number if you have one."}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address (Optional)</Label>
                          <div className="relative">
                            <Input
                              {...registerForm.register("email")}
                              id="email"
                              type="email"
                              placeholder="john.doe@company.com"
                              className="pl-10"
                            />
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-uventorybiz-gray" />
                          </div>
                          {registerForm.formState.errors.email && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                          <div className="relative">
                            <Input
                              {...registerForm.register("phoneNumber")}
                              id="phoneNumber"
                              placeholder="+1 (555) 123-4567"
                              className="pl-10"
                            />
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-uventorybiz-gray" />
                          </div>
                          {registerForm.formState.errors.phoneNumber && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.phoneNumber.message}</p>
                          )}
                        </div>



                        <div className="space-y-2">
                          <Label htmlFor="registerPassword">Password</Label>
                          <div className="relative">
                            <Input
                              {...registerForm.register("password")}
                              id="registerPassword"
                              type="password"
                              placeholder="Create a strong password"
                              className="pl-10"
                            />
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-uventorybiz-gray" />
                          </div>
                          {registerForm.formState.errors.password && (
                            <p className="text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
                          )}
                        </div>

                        <Controller
                          name="acceptTermsAndPrivacy"
                          control={registerForm.control}
                          render={({ field }) => (
                            <div className="space-y-2">
                              <div className="flex items-start gap-3 rounded-md border border-uventorybiz-gray/20 bg-uventorybiz-light-gray/30 p-3">
                                <Checkbox
                                  id="acceptTermsAndPrivacy"
                                  checked={field.value}
                                  onCheckedChange={(v) => field.onChange(v === true)}
                                  className="mt-0.5"
                                />
                                <label
                                  htmlFor="acceptTermsAndPrivacy"
                                  className="text-sm text-uventorybiz-gray leading-snug cursor-pointer"
                                >
                                  I agree to the{" "}
                                  <Link href="/terms" className="text-uventorybiz-navy font-medium hover:underline">
                                    Terms of Service
                                  </Link>
                                  ,{" "}
                                  <Link href="/privacy" className="text-uventorybiz-navy font-medium hover:underline">
                                    Privacy Policy
                                  </Link>
                                  , and acknowledge the{" "}
                                  <Link href="/legal" className="text-uventorybiz-navy font-medium hover:underline">
                                    Agreements
                                  </Link>{" "}
                                  available for my organisation.
                                </label>
                              </div>
                              {registerForm.formState.errors.acceptTermsAndPrivacy && (
                                <p className="text-sm text-red-600">
                                  {registerForm.formState.errors.acceptTermsAndPrivacy.message}
                                </p>
                              )}
                            </div>
                          )}
                        />

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setRegistrationStep("choose")}
                              className="flex-1"
                            >
                              <ArrowLeft className="w-4 h-4 mr-2" />
                              Back
                            </Button>
                            <Button 
                              type="submit" 
                              className="flex-1 bg-uventorybiz-navy hover:bg-uventorybiz-navy/90"
                              disabled={registerMutation.isPending}
                            >
                              {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Create Account
                            </Button>
                          </div>
                        </form>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardHeader>
              </Card>

              <p className="text-center text-sm text-uventorybiz-gray max-w-md mx-auto lg:mx-0">
                Customer or supplier?{" "}
                <Link
                  href="/portal"
                  className="font-bold text-uventorybiz-coral hover:text-uventorybiz-coral/80 hover:underline"
                >
                  Go to the customer & supplier portal
                </Link>
              </p>
            </div>

            {/* Right Column - Hero Content */}
            <div className="hidden lg:block space-y-8">
                <BrandLogo
                  variant="full"
                  alt="uventorybiz"
                  className="w-full lg:mx-0 mb-6"
                />
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Comprehensive Business Management
                </h2>
                <p className="text-uventorybiz-gray mb-6">
                  uventorybiz provides the tools you need to manage inventory, process sales,
                  coordinate fleet and staff, and run day-to-day operations across your sites.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Inventory & POS</h3>
                      <p className="text-sm text-uventorybiz-gray">Stock levels, sales transactions, and purchase orders across locations</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Safety Compliance</h3>
                      <p className="text-sm text-uventorybiz-gray">Automated compliance tracking and incident reporting</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Secure Communication</h3>
                      <p className="text-sm text-uventorybiz-gray">GDPR-Compliant messaging and document sharing</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-uventorybiz-gray">
                <p>Trusted by multi-site businesses worldwide</p>
                <p className="mt-2 font-semibold text-uventorybiz-navy">500+ Active Users • 99.9% Uptime • 24/7 Support</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}