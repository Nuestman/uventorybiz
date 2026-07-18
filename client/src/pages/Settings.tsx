import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MobileNav from "@/components/MobileNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings as SettingsIcon,
  Loader2,
  Save,
  DollarSign,
  Palette,
  RotateCcw,
  X,
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  Globe2,
  Copy,
  UserPlus,
  Mail,
  Ban,
  Check,
  XCircle,
  TestTube,
} from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { SimpleFileUploader } from "@/components/SimpleFileUploader";
import NotificationPreferencesManager from "@/components/admin/NotificationPreferencesManager";
import { isPocEligibleCategory } from "@shared/poc";

const CURRENCY_OPTIONS = [
  { value: "GHS", label: "GHS - Ghanaian Cedi" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "ZAR", label: "ZAR - South African Rand" },
  { value: "XAF", label: "XAF - Central African CFA Franc" },
  { value: "XOF", label: "XOF - West African CFA Franc" },
];

const LOGO_OPTIONS = [
  { value: "default", label: "Use default (uventorybiz)" },
  { value: "custom", label: "Upload custom logo" },
];

const FAVICON_OPTIONS = [
  { value: "default", label: "Use default" },
  { value: "custom", label: "Upload custom favicon" },
];

const PRIMARY_COLOR_OPTIONS = [
  { value: "default", label: "Use default (Navy)" },
  { value: "#142F5C", label: "Navy (#142F5C)" },
  { value: "#2563eb", label: "Blue (#2563eb)" },
  { value: "#059669", label: "Green (#059669)" },
  { value: "#7c3aed", label: "Purple (#7c3aed)" },
  { value: "custom", label: "Custom…" },
];

const settingsFormSchema = z.object({
  currencyCode: z.string().min(1, "Select a currency"),
  appName: z.string().optional(),
  logoOption: z.enum(["default", "custom"]).optional(),
  logoUrl: z.string().optional(),
  primaryColorOption: z.string().optional(),
  primaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Use hex e.g. #142F5C")
    .optional()
    .or(z.literal("")),
  faviconOption: z.enum(["default", "custom"]).optional(),
  faviconUrl: z.string().optional(),
});

type SettingsFormData = z.infer<typeof settingsFormSchema>;

interface TenantSettings {
  tenantId: string;
  tenantName: string;
  currencyCode: string;
  appName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  faviconUrl: string | null;
  returnsEnabled: boolean;
  pocTestingEnabled: boolean;
  businessCategory: string;
}

const DEFAULT_SETTINGS = {
  currencyCode: "GHS",
  appName: null,
  logoUrl: null,
  primaryColor: null,
  faviconUrl: null,
} as const;

const dutyPriorityColors = {
  low: "bg-blue-100 text-blue-800",
  normal: "bg-green-100 text-green-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
} as const;

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = user?.role === "admin" || user?.role === "super_admin";

  const [openSaveConfirm, setOpenSaveConfirm] = useState(false);
  const [openRestoreConfirm, setOpenRestoreConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "branding" | "notifications" | "duties" | "features" | "portal" | "security"
  >("branding");

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const queryTab = new URLSearchParams(window.location.search).get("tab");
    const raw = hash || queryTab || "";
    if (
      raw === "branding" ||
      raw === "notifications" ||
      raw === "duties" ||
      raw === "features" ||
      raw === "portal" ||
      raw === "security"
    ) {
      setActiveTab(raw);
    }
  }, []);

  type PortalFeaturesState = {
    appointments: boolean;
    vitals: boolean;
    symptoms: boolean;
    visits: boolean;
    healthProfile: boolean;
    employeeProfile: boolean;
    medications: boolean;
    messaging: boolean;
  };

  interface AdminPortalSettingsDto {
    enabled: boolean;
    supportEmail: string | null;
    privacyPolicyUrl: string | null;
    portalSlug: string | null;
    features: PortalFeaturesState;
  }

  type PortalUserRow = {
    id: string;
    email: string;
    status: string;
    partyType: "customer" | "supplier";
    customerId: string | null;
    supplierId: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    partyName: string;
  };

  type PortalAccessRequestRow = {
    id: string;
    email: string;
    status: string;
    requestKind: string;
    matchKind: string;
    customerId: string | null;
    supplierId: string | null;
    partyType: "customer" | "supplier" | null;
    partyName: string | null;
    partyNumber: string | null;
    reviewerNotes: string | null;
    reviewedAt: string | null;
    createdAt: string;
  };

  type CustomerHit = {
    id: string;
    firstName: string;
    lastName: string;
    customerNumber: string | null;
    email: string | null;
  };

  type SupplierHit = {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
  };

  const [portalEnabled, setPortalEnabled] = useState(false);
  const [portalSlugDraft, setPortalSlugDraft] = useState("");
  const [portalSupportEmail, setPortalSupportEmail] = useState("");
  const [portalPrivacyUrl, setPortalPrivacyUrl] = useState("");
  const [portalFeatures, setPortalFeatures] = useState<PortalFeaturesState>({
    appointments: true,
    vitals: true,
    symptoms: true,
    visits: true,
    healthProfile: true,
    employeeProfile: true,
    medications: true,
    messaging: true,
  });
  const [portalCreateOpen, setPortalCreateOpen] = useState(false);
  const [portalCreatePartyType, setPortalCreatePartyType] = useState<"customer" | "supplier">("customer");
  const [portalPartyQuery, setPortalPartyQuery] = useState("");
  const [debouncedPartyQ, setDebouncedPartyQ] = useState("");
  const [portalCreatePartyId, setPortalCreatePartyId] = useState<string | null>(null);
  const [portalCreatePartyLabel, setPortalCreatePartyLabel] = useState("");
  const [portalCreateEmail, setPortalCreateEmail] = useState("");
  const [portalCreatePassword, setPortalCreatePassword] = useState("");
  const [portalDeleteId, setPortalDeleteId] = useState<string | null>(null);
  const [accessReviewId, setAccessReviewId] = useState<string | null>(null);
  const [accessReviewAction, setAccessReviewAction] = useState<"approve" | "reject" | null>(null);
  const [accessReviewNotes, setAccessReviewNotes] = useState("");

  type SecuritySettingsDto = {
    staffSessionAbsoluteHours: number;
    staffSessionIdleMinutes: number;
    portalSessionAbsoluteDays: number;
    portalSessionIdleMinutes: number;
    portalSessionSlidingDays: number;
    sessionWarningLeadMinutes: number;
    requireMfa: boolean;
  };

  const [securityDraft, setSecurityDraft] = useState<SecuritySettingsDto>({
    staffSessionAbsoluteHours: 12,
    staffSessionIdleMinutes: 30,
    portalSessionAbsoluteDays: 14,
    portalSessionIdleMinutes: 60,
    portalSessionSlidingDays: 7,
    sessionWarningLeadMinutes: 3,
    requireMfa: false,
  });

  const { data: securitySettings } = useQuery<SecuritySettingsDto>({
    queryKey: ["/api/admin/security-settings"],
    enabled: canEdit,
  });

  useEffect(() => {
    if (securitySettings) setSecurityDraft({ ...securitySettings });
  }, [securitySettings]);

  const saveSecurityMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/security-settings", securityDraft);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/security-settings"] });
      toast({ title: "Security settings saved", description: "Session and MFA policy updated." });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not save security settings",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const { data: settings, isLoading } = useQuery<TenantSettings>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn<TenantSettings>({ on401: "throw" }),
  });

  const { data: duties = [], isLoading: dutiesLoading } = useQuery<any[]>({
    queryKey: ["/api/operational-duties"],
    queryFn: async () => {
      const res = await fetch("/api/operational-duties");
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedPartyQ(portalPartyQuery.trim()), 350);
    return () => window.clearTimeout(t);
  }, [portalPartyQuery]);

  const { data: portalSettings, isLoading: portalSettingsLoading } = useQuery<AdminPortalSettingsDto>({
    queryKey: ["/api/admin/portal-settings"],
    queryFn: getQueryFn<AdminPortalSettingsDto>({ on401: "throw" }),
    enabled: canEdit,
  });

  useEffect(() => {
    if (!portalSettings) return;
    setPortalEnabled(portalSettings.enabled);
    setPortalSlugDraft(portalSettings.portalSlug ?? "");
    setPortalSupportEmail(portalSettings.supportEmail ?? "");
    setPortalPrivacyUrl(portalSettings.privacyPolicyUrl ?? "");
    setPortalFeatures({ ...portalSettings.features });
  }, [portalSettings]);

  const { data: portalUsers = [], isLoading: portalUsersLoading } = useQuery<PortalUserRow[]>({
    queryKey: ["/api/admin/portal-users"],
    queryFn: getQueryFn<PortalUserRow[]>({ on401: "throw" }),
    enabled: canEdit && activeTab === "portal",
  });

  const { data: portalAccessRequests = [], isLoading: portalAccessRequestsLoading } = useQuery<
    PortalAccessRequestRow[]
  >({
    queryKey: ["/api/admin/portal-access-requests", { status: "pending" }],
    queryFn: async () => {
      const res = await fetch("/api/admin/portal-access-requests?status=pending", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load access requests");
      return res.json();
    },
    enabled: canEdit && activeTab === "portal",
  });

  const { data: portalCustomerHits = [] } = useQuery<CustomerHit[]>({
    queryKey: ["/api/customers", { search: debouncedPartyQ }],
    queryFn: async () => {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(debouncedPartyQ)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search customers");
      return res.json();
    },
    enabled:
      canEdit && portalCreateOpen && portalCreatePartyType === "customer" && debouncedPartyQ.length >= 2,
  });

  const { data: allSuppliers = [] } = useQuery<SupplierHit[]>({
    queryKey: ["/api/suppliers"],
    queryFn: getQueryFn<SupplierHit[]>({ on401: "throw" }),
    enabled: canEdit && portalCreateOpen && portalCreatePartyType === "supplier",
  });

  const portalSupplierHits =
    debouncedPartyQ.length >= 2
      ? allSuppliers.filter((s) =>
          `${s.name} ${s.contactName ?? ""} ${s.email ?? ""}`
            .toLowerCase()
            .includes(debouncedPartyQ.toLowerCase()),
        )
      : [];

  const savePortalMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/admin/portal-settings", {
        enabled: portalEnabled,
        supportEmail: portalSupportEmail.trim() || null,
        privacyPolicyUrl: portalPrivacyUrl.trim() || null,
        portalSlug: portalSlugDraft.trim() || null,
        features: portalFeatures,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/portal-settings"] });
      toast({
        title: "Portal settings saved",
        description: "Changes apply immediately for new portal sessions.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not save portal settings",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const createPortalUserMutation = useMutation({
    mutationFn: async () => {
      if (!portalCreatePartyId) throw new Error("Select a customer or supplier");
      const res = await apiRequest("POST", "/api/admin/portal-users", {
        partyType: portalCreatePartyType,
        ...(portalCreatePartyType === "customer"
          ? { customerId: portalCreatePartyId }
          : { supplierId: portalCreatePartyId }),
        email: portalCreateEmail.trim(),
        password: portalCreatePassword,
      });
      return res.json();
    },
    onSuccess: (data: { emailSent?: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/portal-users"] });
      toast({
        title: "Portal account created",
        description: data?.emailSent === false
          ? "Account created, but the welcome email could not be sent. Share the sign-in link and credentials manually."
          : "A welcome email with sign-in details was sent to the user.",
      });
      setPortalCreateOpen(false);
      setPortalPartyQuery("");
      setDebouncedPartyQ("");
      setPortalCreatePartyId(null);
      setPortalCreatePartyLabel("");
      setPortalCreateEmail("");
      setPortalCreatePassword("");
    },
    onError: (err: Error) => {
      toast({
        title: "Could not create portal account",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const deletePortalUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/portal-users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/portal-users"] });
      toast({ title: "Portal account removed" });
      setPortalDeleteId(null);
    },
    onError: (err: Error) => {
      toast({
        title: "Could not remove account",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const updatePortalUserStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "suspended" }) => {
      await apiRequest("PATCH", `/api/admin/portal-users/${id}/status`, { status });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/portal-users"] });
      toast({
        title: vars.status === "suspended" ? "Portal access suspended" : "Portal access reactivated",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not update account",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const resendPortalMagicLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/portal-users/${id}/magic-link`);
      return res.json() as Promise<{ emailSent?: boolean }>;
    },
    onSuccess: (data) => {
      toast({
        title: "Magic link sent",
        description:
          data.emailSent === false
            ? "Could not send email. Check SMTP settings."
            : "A sign-in link was emailed to the user.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not send magic link",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const reviewAccessRequestMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      notes,
    }: {
      id: string;
      action: "approve" | "reject";
      notes?: string;
    }) => {
      const path =
        action === "approve"
          ? `/api/admin/portal-access-requests/${id}/approve`
          : `/api/admin/portal-access-requests/${id}/reject`;
      await apiRequest("POST", path, { notes: notes?.trim() || null });
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/portal-access-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/portal-users"] });
      toast({
        title: vars.action === "approve" ? "Access approved" : "Access request rejected",
        description:
          vars.action === "approve"
            ? "Portal account provisioned and welcome email sent when possible."
            : "The requester was not granted portal access.",
      });
      setAccessReviewId(null);
      setAccessReviewAction(null);
      setAccessReviewNotes("");
    },
    onError: (err: Error) => {
      toast({
        title: "Could not review request",
        description: err.message.replace(/^\d+:\s*/, ""),
        variant: "destructive",
      });
    },
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      currencyCode: "GHS",
      appName: "",
      logoOption: "default",
      logoUrl: "",
      primaryColorOption: "default",
      primaryColor: "",
      faviconOption: "default",
      faviconUrl: "",
    },
  });

  const logoOption = form.watch("logoOption");
  const faviconOption = form.watch("faviconOption");
  const primaryColorOption = form.watch("primaryColorOption");

  useEffect(() => {
    if (!settings) return;
    const presetColor = PRIMARY_COLOR_OPTIONS.find((o) => o.value === settings.primaryColor)?.value;
    form.reset({
      currencyCode: settings.currencyCode || "GHS",
      appName: settings.appName ?? "",
      logoOption: settings.logoUrl ? "custom" : "default",
      logoUrl: settings.logoUrl ?? "",
      primaryColorOption: presetColor ?? (settings.primaryColor ? "custom" : "default"),
      primaryColor: settings.primaryColor ?? "",
      faviconOption: settings.faviconUrl ? "custom" : "default",
      faviconUrl: settings.faviconUrl ?? "",
    });
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      currencyCode: string;
      appName: string | null;
      logoUrl: string | null;
      primaryColor: string | null;
      faviconUrl: string | null;
    }) => {
      const res = await apiRequest("PATCH", "/api/settings", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved", description: "Tenant settings updated successfully." });
      setOpenSaveConfirm(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to save",
        description: err.message || "Could not update settings.",
        variant: "destructive",
      });
    },
  });

  // Standalone toggle — saved immediately, independent of the branding form/save flow.
  const returnsToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("PATCH", "/api/settings", { returnsEnabled: enabled });
      return res.json();
    },
    onSuccess: (data: TenantSettings) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: data.returnsEnabled ? "Returns enabled" : "Returns disabled",
        description: data.returnsEnabled
          ? "Customers can request returns and staff can process POS refunds."
          : "POS returns and portal return requests are now blocked.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update returns setting",
        description: err.message || "Could not update settings.",
        variant: "destructive",
      });
    },
  });

  // Standalone toggle — saved immediately, independent of the branding form/save flow.
  const pocTestingToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("PATCH", "/api/settings", { pocTestingEnabled: enabled });
      return res.json();
    },
    onSuccess: (data: TenantSettings) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: data.pocTestingEnabled ? "POC lab testing enabled" : "POC lab testing disabled",
        description: data.pocTestingEnabled
          ? "The Point-of-Care Laboratory module is now available in the sidebar."
          : "The Point-of-Care Laboratory module is now hidden.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to update POC testing setting",
        description: err.message || "Could not update settings.",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/settings", DEFAULT_SETTINGS);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Defaults restored", description: "Tenant settings have been reset to defaults." });
      setOpenRestoreConfirm(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to restore",
        description: err.message || "Could not restore defaults.",
        variant: "destructive",
      });
    },
  });

  function submitSave() {
    const values = form.getValues();
    const primaryColor =
      values.primaryColorOption === "custom"
        ? (values.primaryColor || null)
        : values.primaryColorOption && values.primaryColorOption !== "default"
          ? values.primaryColorOption
          : null;
    updateMutation.mutate({
      currencyCode: values.currencyCode,
      appName: values.appName || null,
      logoUrl: logoOption === "custom" && values.logoUrl ? values.logoUrl : null,
      primaryColor: primaryColor || null,
      faviconUrl: faviconOption === "custom" && values.faviconUrl ? values.faviconUrl : null,
    });
  }

  function onSaveClick() {
    form.handleSubmit(() => setOpenSaveConfirm(true))();
  }

  function confirmSave() {
    submitSave();
  }

  if (isLoading || !settings) {
    return (
      <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 pb-20 md:pb-8 bg-uventorybiz-light-gray flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-uventorybiz-navy" />
          <h1 className="text-2xl font-semibold text-uventorybiz-navy">Tenant Settings</h1>
        </div>
        {canEdit && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpenRestoreConfirm(true)}
            disabled={restoreMutation.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Restore to defaults
          </Button>
        )}
      </div>
      <p className="text-muted-foreground">
        Configure currency, branding, and white-label options for <strong>{settings.tenantName}</strong>.
        {!canEdit && " Only administrators can change these settings."}
      </p>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="tabs-list-custom mb-4 overflow-x-auto">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 min-w-[min(100%,720px)] sm:min-w-[720px] bg-transparent h-auto p-1 gap-1 lg:gap-2">
            <TabsTrigger value="branding" className="tab-trigger-custom text-xs sm:text-sm">
              Branding & Currency
            </TabsTrigger>
            <TabsTrigger value="notifications" className="tab-trigger-custom text-xs sm:text-sm">
              Notifications
            </TabsTrigger>
            <TabsTrigger value="duties" className="tab-trigger-custom text-xs sm:text-sm">
              Operational Duties
            </TabsTrigger>
            <TabsTrigger value="features" className="tab-trigger-custom text-xs sm:text-sm">
              Features
            </TabsTrigger>
            <TabsTrigger value="portal" className="tab-trigger-custom text-xs sm:text-sm">
              Portal
            </TabsTrigger>
            <TabsTrigger value="security" className="tab-trigger-custom text-xs sm:text-sm">
              Security
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="branding" className="space-y-6">
          <Form {...form}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!canEdit) return;
                form.handleSubmit(
                  () => setOpenSaveConfirm(true),
                  () => {}
                )();
              }}
              className="space-y-6"
            >
          {/* Currency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Currency
              </CardTitle>
              <CardDescription>
                Default currency for the UI and inventory (prices, reports).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="currencyCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!canEdit}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Returns & refunds policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Returns &amp; refunds
              </CardTitle>
              <CardDescription>
                When disabled, POS returns are blocked and portal customers cannot request returns
                on completed orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Accept returns/refunds</p>
                  <p className="text-xs text-muted-foreground">
                    Applies immediately across POS and the customer portal.
                  </p>
                </div>
                <Switch
                  checked={settings.returnsEnabled !== false}
                  disabled={!canEdit || returnsToggleMutation.isPending}
                  onCheckedChange={(checked) => returnsToggleMutation.mutate(checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Point-of-care lab testing — pharmacies & laboratories only */}
          {isPocEligibleCategory(settings.businessCategory) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Point-of-care lab testing
              </CardTitle>
              <CardDescription>
                Instant tests (hemoglobin, pregnancy, malaria, typhoid) for walk-in customers.
                Enabling adds the Point-of-Care Laboratory module to the sidebar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Offer POC lab testing</p>
                  <p className="text-xs text-muted-foreground">
                    Applies immediately; the module appears or disappears from navigation.
                  </p>
                </div>
                <Switch
                  checked={settings.pocTestingEnabled === true}
                  disabled={!canEdit || pocTestingToggleMutation.isPending}
                  onCheckedChange={(checked) => pocTestingToggleMutation.mutate(checked)}
                />
              </div>
            </CardContent>
          </Card>
          )}

          {/* White labeling */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                White Labeling
              </CardTitle>
              <CardDescription>
                Customize the application name, logo, and primary color for this tenant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="appName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Application name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. uventorybiz"
                        {...field}
                        disabled={!canEdit}
                      />
                    </FormControl>
                    <FormDescription>Shown in the header and browser title when set.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Logo: dropdown + upload */}
              <div className="space-y-2">
                <FormLabel>Logo</FormLabel>
                <FormField
                  control={form.control}
                  name="logoOption"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          if (v === "default") form.setValue("logoUrl", "");
                        }}
                        value={field.value}
                        disabled={!canEdit}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LOGO_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                {logoOption === "custom" && canEdit && (
                  <div className="flex flex-wrap items-center gap-2">
                    <SimpleFileUploader
                      category="tenant-branding"
                      accept="image/*"
                      maxSizeMB={2}
                      buttonText="Upload logo"
                      onUploadComplete={(url) => form.setValue("logoUrl", url)}
                    />
                    {form.watch("logoUrl") && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => form.setValue("logoUrl", "")}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                    {form.watch("logoUrl") && (
                      <img
                        src={form.watch("logoUrl")}
                        alt="Logo preview"
                        className="h-10 object-contain border rounded"
                      />
                    )}
                  </div>
                )}
                <FormDescription>Logo used in the sidebar and header.</FormDescription>
              </div>

              {/* Primary color: dropdown + optional custom */}
              <FormField
                control={form.control}
                name="primaryColorOption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary color</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        if (v !== "custom") form.setValue("primaryColor", v === "default" ? "" : v);
                      }}
                      value={field.value ?? "default"}
                      disabled={!canEdit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PRIMARY_COLOR_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {primaryColorOption === "custom" && canEdit && (
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            placeholder="#142F5C"
                            {...field}
                            className="font-mono max-w-[140px]"
                          />
                          {field.value && (
                            <div
                              className="h-10 w-14 shrink-0 rounded-md border border-input"
                              style={{ backgroundColor: field.value }}
                              title={field.value}
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormDescription>Hex color for buttons and accents.</FormDescription>

              {/* Favicon: dropdown + upload */}
              <div className="space-y-2">
                <FormLabel>Favicon</FormLabel>
                <FormField
                  control={form.control}
                  name="faviconOption"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        onValueChange={(v) => {
                          field.onChange(v);
                          if (v === "default") form.setValue("faviconUrl", "");
                        }}
                        value={field.value}
                        disabled={!canEdit}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FAVICON_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                {faviconOption === "custom" && canEdit && (
                  <div className="flex flex-wrap items-center gap-2">
                    <SimpleFileUploader
                      category="tenant-branding"
                      accept="image/x-icon,image/png,image/svg+xml"
                      maxSizeMB={1}
                      buttonText="Upload favicon"
                      onUploadComplete={(url) => form.setValue("faviconUrl", url)}
                    />
                    {form.watch("faviconUrl") && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => form.setValue("faviconUrl", "")}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                    {form.watch("faviconUrl") && (
                      <img
                        src={form.watch("faviconUrl")}
                        alt="Favicon preview"
                        className="h-8 w-8 object-contain border rounded"
                      />
                    )}
                  </div>
                )}
                <FormDescription>Favicon for the browser tab.</FormDescription>
              </div>
            </CardContent>
          </Card>

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                Save settings
              </Button>
            </div>
          )}
        </form>
      </Form>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications & Alerts</CardTitle>
              <CardDescription>
                Configure which alerts and notifications this tenant should receive. Same configuration as the Admin panel, scoped to this tenant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferencesManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Duty definitions - Modify/Add More</CardTitle>
              <CardDescription>
                Reusable duty types for this tenant. Use the Operational Duties page to assign these to posts and manage daily tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dutiesLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading duty definitions...
                </div>
              ) : !Array.isArray(duties) || duties.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No duty definitions yet. Create one from the Operational Duties page.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        window.location.href = "/operational-duties";
                      }}
                    >
                      Manage in Operational Duties
                    </Button>
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Duty name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Frequency</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {duties.map((duty: any) => (
                          <TableRow key={duty.id}>
                            <TableCell className="font-medium">{duty.title}</TableCell>
                            <TableCell className="text-sm">{duty.category}</TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                                  dutyPriorityColors[duty.priority as keyof typeof dutyPriorityColors] || "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {duty.priority}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm capitalize">{duty.frequency}</TableCell>
                            <TableCell className="text-sm">
                              {duty.estimatedDuration != null ? `${duty.estimatedDuration} min` : "—"}
                            </TableCell>
                            <TableCell>
                              {duty.isActive !== false ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                  Yes
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                                  No
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[240px] truncate" title={duty.description || undefined}>
                              {duty.description || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature toggles (coming soon)</CardTitle>
              <CardDescription>
                Planned interface for enabling/disabling modules per tenant (e.g. Operational Duties, Testing, Multi-location, Inventory analytics).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This section will allow tenant admins to toggle high-level modules on or off without code changes. The backend will enforce
                feature flags in routes and UI will hide modules when disabled.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Operational Duties</p>
                    <p className="text-xs text-muted-foreground">
                      Daily duty scheduling, assignments, and duty spawner.
                    </p>
                  </div>
                  {/* Placeholder switch – disabled for now */}
                  <Button variant="outline" size="sm" disabled>
                    Planned
                  </Button>
                </div>
                <div className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Drug & Alcohol Testing</p>
                    <p className="text-xs text-muted-foreground">
                      Testing, scheduling, and compliance reports.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Planned
                  </Button>
                </div>
                <div className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Multi-location</p>
                    <p className="text-xs text-muted-foreground">
                      Additional care locations, central store, and transfers.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Planned
                  </Button>
                </div>
                <div className="flex items-center justify-between border rounded-md px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Inventory analytics</p>
                    <p className="text-xs text-muted-foreground">
                      Advanced dashboards for stock, expiry, and usage trends.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Planned
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Plan: add a `tenant_features` table (or JSON column on tenants) with boolean flags per module; expose `/api/settings/features`
                for GET/PATCH; gate routes and UI using these flags; and add audit logging for feature changes.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="portal" className="space-y-6">
          {!canEdit ? (
            <Card>
              <CardHeader>
                <CardTitle>Portal</CardTitle>
                <CardDescription>Only tenant administrators can configure the portal.</CardDescription>
              </CardHeader>
            </Card>
          ) : portalSettingsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading portal settings…
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe2 className="h-5 w-5" />
                    Portal
                  </CardTitle>
                  <CardDescription>
                    Separate sign-in for customers and suppliers. Uses its own session cookie and shows only their own record when features are
                    enabled below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Enable portal</p>
                      <p className="text-xs text-muted-foreground">When off, public tenant lookup and portal login reject this organization.</p>
                    </div>
                    <Switch checked={portalEnabled} onCheckedChange={setPortalEnabled} aria-label="Enable portal" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="portal-slug">Portal organization code</Label>
                      <Input
                        id="portal-slug"
                        placeholder="e.g. acme-mine"
                        value={portalSlugDraft}
                        onChange={(e) => setPortalSlugDraft(e.target.value)}
                        disabled={!canEdit}
                      />
                      <p className="text-xs text-muted-foreground">
                        Lowercase letters, numbers, and hyphens. Saved value is normalized. Customers and suppliers enter this on the
                        sign-in page to load your branding.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Sign-in link</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={
                            typeof window !== "undefined"
                              ? `${window.location.origin}/portal/login${portalSlugDraft.trim() ? `?org=${encodeURIComponent(portalSlugDraft.trim())}` : ""}`
                              : "/portal/login"
                          }
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Copy link"
                          onClick={() => {
                            const href =
                              typeof window !== "undefined"
                                ? `${window.location.origin}/portal/login${portalSlugDraft.trim() ? `?org=${encodeURIComponent(portalSlugDraft.trim())}` : ""}`
                                : "";
                            void navigator.clipboard.writeText(href).then(() =>
                              toast({ title: "Copied", description: "Portal sign-in link copied to clipboard." }),
                            );
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="portal-support">Support email (shown on portal)</Label>
                      <Input
                        id="portal-support"
                        type="email"
                        placeholder="support@example.com"
                        value={portalSupportEmail}
                        onChange={(e) => setPortalSupportEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portal-privacy">Privacy policy URL</Label>
                      <Input
                        id="portal-privacy"
                        type="url"
                        placeholder="https://…"
                        value={portalPrivacyUrl}
                        onChange={(e) => setPortalPrivacyUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Portal features</p>
                    <p className="text-xs text-muted-foreground">Turn sections on or off for all portal users in this tenant.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          { key: "appointments" as const, label: "Appointments", hint: "Requests and appointment list" },
                          { key: "employeeProfile" as const, label: "Personal profile", hint: "Photo, DOB, phone, emergency contacts" },
                          { key: "messaging" as const, label: "Secure messaging", hint: "Non-urgent portal ↔ staff threads" },
                        ] as const
                      ).map((row) => (
                        <div
                          key={row.key}
                          className="flex items-center justify-between gap-3 rounded-md border px-3 py-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-medium">{row.label}</p>
                            <p className="text-xs text-muted-foreground">{row.hint}</p>
                          </div>
                          <Switch
                            checked={portalFeatures[row.key]}
                            onCheckedChange={(v) =>
                              setPortalFeatures((f) => ({ ...f, [row.key]: Boolean(v) }))
                            }
                            aria-label={row.label}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button type="button" onClick={() => savePortalMutation.mutate()} disabled={savePortalMutation.isPending}>
                    {savePortalMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save portal settings
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Access requests</CardTitle>
                  <CardDescription>
                    People who requested portal access or sign-in help from the public portal. Admins receive an
                    in-app notification for each new request.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {portalAccessRequestsLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading…
                    </div>
                  ) : portalAccessRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No pending access requests.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Matched record</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead>Requested</TableHead>
                            <TableHead className="w-[180px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {portalAccessRequests.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="font-mono text-xs">{r.email}</TableCell>
                              <TableCell>
                                {r.partyName ? (
                                  <>
                                    <div className="font-medium">{r.partyName}</div>
                                    <div className="text-xs text-muted-foreground capitalize">
                                      {r.partyType}
                                      {r.partyNumber ? ` · ${r.partyNumber}` : ""}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">No matching record</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs capitalize">
                                {r.matchKind.replace(/_/g, " ")}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(r.createdAt).toLocaleString(undefined, {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })}
                              </TableCell>
                              <TableCell className="text-right space-x-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={reviewAccessRequestMutation.isPending}
                                  onClick={() => {
                                    setAccessReviewId(r.id);
                                    setAccessReviewAction("approve");
                                    setAccessReviewNotes("");
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  disabled={reviewAccessRequestMutation.isPending}
                                  onClick={() => {
                                    setAccessReviewId(r.id);
                                    setAccessReviewAction("reject");
                                    setAccessReviewNotes("");
                                  }}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Reject
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>Portal accounts</CardTitle>
                    <CardDescription>Provision credentials per customer or supplier. One portal login per record.</CardDescription>
                  </div>
                  <Button type="button" onClick={() => setPortalCreateOpen(true)} size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add portal account
                  </Button>
                </CardHeader>
                <CardContent>
                  {portalUsersLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-6">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading…
                    </div>
                  ) : portalUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No portal accounts yet.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Account holder</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last sign-in</TableHead>
                            <TableHead className="w-[160px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {portalUsers.map((u) => (
                            <TableRow key={u.id}>
                              <TableCell>
                                <div className="font-medium">{u.partyName}</div>
                                <div className="text-xs text-muted-foreground capitalize">{u.partyType}</div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{u.email}</TableCell>
                              <TableCell className="capitalize">{u.status}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {u.lastLoginAt
                                  ? new Date(u.lastLoginAt).toLocaleString(undefined, {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-wrap justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    title="Send magic link"
                                    disabled={resendPortalMagicLinkMutation.isPending || u.status === "suspended"}
                                    onClick={() => resendPortalMagicLinkMutation.mutate(u.id)}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                  {u.status === "suspended" ? (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      title="Reactivate account"
                                      disabled={updatePortalUserStatusMutation.isPending}
                                      onClick={() =>
                                        updatePortalUserStatusMutation.mutate({ id: u.id, status: "active" })
                                      }
                                    >
                                      <Check className="h-4 w-4 text-emerald-600" />
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      title="Suspend account"
                                      disabled={updatePortalUserStatusMutation.isPending}
                                      onClick={() =>
                                        updatePortalUserStatusMutation.mutate({ id: u.id, status: "suspended" })
                                      }
                                    >
                                      <Ban className="h-4 w-4 text-amber-600" />
                                    </Button>
                                  )}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    title="Remove portal account"
                                    onClick={() => setPortalDeleteId(u.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Dialog
                open={accessReviewId !== null && accessReviewAction !== null}
                onOpenChange={(open) => {
                  if (!open) {
                    setAccessReviewId(null);
                    setAccessReviewAction(null);
                    setAccessReviewNotes("");
                  }
                }}
              >
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {accessReviewAction === "approve" ? "Approve portal access" : "Reject access request"}
                    </DialogTitle>
                    <DialogDescription>
                      {accessReviewAction === "approve"
                        ? "Creates or reactivates a portal account and emails the user a welcome message with sign-in details."
                        : "The requester will not receive portal credentials. Add an optional note for your records."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <Label htmlFor="access-review-notes">Notes (optional)</Label>
                    <Input
                      id="access-review-notes"
                      value={accessReviewNotes}
                      onChange={(e) => setAccessReviewNotes(e.target.value)}
                      placeholder="Internal note…"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setAccessReviewId(null);
                        setAccessReviewAction(null);
                        setAccessReviewNotes("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant={accessReviewAction === "reject" ? "destructive" : "default"}
                      disabled={!accessReviewId || !accessReviewAction || reviewAccessRequestMutation.isPending}
                      onClick={() => {
                        if (!accessReviewId || !accessReviewAction) return;
                        reviewAccessRequestMutation.mutate({
                          id: accessReviewId,
                          action: accessReviewAction,
                          notes: accessReviewNotes,
                        });
                      }}
                    >
                      {reviewAccessRequestMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : accessReviewAction === "approve" ? (
                        "Approve & provision"
                      ) : (
                        "Reject request"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={portalCreateOpen} onOpenChange={setPortalCreateOpen}>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add portal account</DialogTitle>
                    <DialogDescription>
                      Link the account to a customer or supplier record, then set the email and password they will use on the portal.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Account type</Label>
                      <div className="flex gap-2">
                        {(["customer", "supplier"] as const).map((t) => (
                          <Button
                            key={t}
                            type="button"
                            size="sm"
                            variant={portalCreatePartyType === t ? "default" : "outline"}
                            className="capitalize"
                            onClick={() => {
                              setPortalCreatePartyType(t);
                              setPortalCreatePartyId(null);
                              setPortalCreatePartyLabel("");
                            }}
                          >
                            {t}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Find {portalCreatePartyType}</Label>
                      <Input
                        placeholder="Type at least 2 characters…"
                        value={portalPartyQuery}
                        onChange={(e) => {
                          setPortalPartyQuery(e.target.value);
                          setPortalCreatePartyId(null);
                          setPortalCreatePartyLabel("");
                        }}
                      />
                      {debouncedPartyQ.length >= 2 && (
                        <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 text-sm">
                          {portalCreatePartyType === "customer" ? (
                            portalCustomerHits.length === 0 ? (
                              <p className="p-3 text-muted-foreground">No matches.</p>
                            ) : (
                              portalCustomerHits.map((hit) => {
                                const label = `${hit.firstName} ${hit.lastName}${hit.customerNumber ? ` · ${hit.customerNumber}` : ""}`;
                                const selected = portalCreatePartyId === hit.id;
                                return (
                                  <button
                                    key={hit.id}
                                    type="button"
                                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted ${selected ? "bg-muted" : ""}`}
                                    onClick={() => {
                                      setPortalCreatePartyId(hit.id);
                                      setPortalCreatePartyLabel(label);
                                      if (!portalCreateEmail.trim() && hit.email) {
                                        setPortalCreateEmail(hit.email);
                                      }
                                    }}
                                  >
                                    <span className="font-medium">{label}</span>
                                    {hit.email ? (
                                      <span className="text-xs text-muted-foreground">{hit.email}</span>
                                    ) : null}
                                  </button>
                                );
                              })
                            )
                          ) : portalSupplierHits.length === 0 ? (
                            <p className="p-3 text-muted-foreground">No matches.</p>
                          ) : (
                            portalSupplierHits.map((hit) => {
                              const label = hit.contactName ? `${hit.name} · ${hit.contactName}` : hit.name;
                              const selected = portalCreatePartyId === hit.id;
                              return (
                                <button
                                  key={hit.id}
                                  type="button"
                                  className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-muted ${selected ? "bg-muted" : ""}`}
                                  onClick={() => {
                                    setPortalCreatePartyId(hit.id);
                                    setPortalCreatePartyLabel(label);
                                    if (!portalCreateEmail.trim() && hit.email) {
                                      setPortalCreateEmail(hit.email);
                                    }
                                  }}
                                >
                                  <span className="font-medium">{label}</span>
                                  {hit.email ? (
                                    <span className="text-xs text-muted-foreground">{hit.email}</span>
                                  ) : null}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                      {portalCreatePartyLabel ? (
                        <p className="text-xs text-muted-foreground">Selected: {portalCreatePartyLabel}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portal-new-email">Portal email (login)</Label>
                      <Input
                        id="portal-new-email"
                        type="email"
                        autoComplete="off"
                        value={portalCreateEmail}
                        onChange={(e) => setPortalCreateEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portal-new-password">Temporary password</Label>
                      <Input
                        id="portal-new-password"
                        type="password"
                        autoComplete="new-password"
                        value={portalCreatePassword}
                        onChange={(e) => setPortalCreatePassword(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">Minimum 8 characters. A welcome email with a sign-in link is sent automatically.</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setPortalCreateOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={
                        createPortalUserMutation.isPending ||
                        !portalCreatePartyId ||
                        portalCreatePassword.length < 8 ||
                        !portalCreateEmail.includes("@")
                      }
                      onClick={() => createPortalUserMutation.mutate()}
                    >
                      {createPortalUserMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        "Create account"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog open={!!portalDeleteId} onOpenChange={(open) => !open && setPortalDeleteId(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove portal account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      The person will no longer be able to sign in to the portal. You can provision a new account later if needed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deletePortalUserMutation.isPending}>Cancel</AlertDialogCancel>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={deletePortalUserMutation.isPending}
                      onClick={() => portalDeleteId && deletePortalUserMutation.mutate(portalDeleteId)}
                    >
                      {deletePortalUserMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Removing…
                        </>
                      ) : (
                        "Remove"
                      )}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session timeouts</CardTitle>
              <CardDescription>
                Control how long staff and portal sessions remain active. Idle timeouts log users out after inactivity.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="staff-abs-hours">Staff max session (hours)</Label>
                <Input
                  id="staff-abs-hours"
                  type="number"
                  min={1}
                  max={168}
                  disabled={!canEdit}
                  value={securityDraft.staffSessionAbsoluteHours}
                  onChange={(e) =>
                    setSecurityDraft((s) => ({ ...s, staffSessionAbsoluteHours: Number(e.target.value) || 12 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-idle-min">Staff idle timeout (minutes)</Label>
                <Input
                  id="staff-idle-min"
                  type="number"
                  min={5}
                  max={480}
                  disabled={!canEdit}
                  value={securityDraft.staffSessionIdleMinutes}
                  onChange={(e) =>
                    setSecurityDraft((s) => ({ ...s, staffSessionIdleMinutes: Number(e.target.value) || 30 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal-abs-days">Portal max session (days)</Label>
                <Input
                  id="portal-abs-days"
                  type="number"
                  min={1}
                  max={90}
                  disabled={!canEdit}
                  value={securityDraft.portalSessionAbsoluteDays}
                  onChange={(e) =>
                    setSecurityDraft((s) => ({ ...s, portalSessionAbsoluteDays: Number(e.target.value) || 14 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal-idle-min">Portal idle timeout (minutes)</Label>
                <Input
                  id="portal-idle-min"
                  type="number"
                  min={5}
                  max={1440}
                  disabled={!canEdit}
                  value={securityDraft.portalSessionIdleMinutes}
                  onChange={(e) =>
                    setSecurityDraft((s) => ({ ...s, portalSessionIdleMinutes: Number(e.target.value) || 60 }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="portal-slide-days">Portal sliding renewal (days per activity)</Label>
                <Input
                  id="portal-slide-days"
                  type="number"
                  min={1}
                  max={30}
                  disabled={!canEdit}
                  value={securityDraft.portalSessionSlidingDays}
                  onChange={(e) =>
                    setSecurityDraft((s) => ({ ...s, portalSessionSlidingDays: Number(e.target.value) || 7 }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="session-warning-lead">Expiry warning (minutes before logout)</Label>
                <Input
                  id="session-warning-lead"
                  type="number"
                  min={1}
                  max={60}
                  disabled={!canEdit}
                  value={securityDraft.sessionWarningLeadMinutes}
                  onChange={(e) =>
                    setSecurityDraft((s) => ({
                      ...s,
                      sessionWarningLeadMinutes: Number(e.target.value) || 3,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Shows a countdown dialog to staff and portal users before their session ends. Must be less than both idle timeouts.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff two-factor authentication</CardTitle>
              <CardDescription>
                When enabled, all staff in this tenant must enroll an authenticator app before accessing the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Require MFA for staff</p>
                <p className="text-xs text-muted-foreground">Portal users use magic-link sign-in (unchanged).</p>
              </div>
              <Switch
                checked={securityDraft.requireMfa}
                disabled={!canEdit}
                onCheckedChange={(checked) => setSecurityDraft((s) => ({ ...s, requireMfa: checked }))}
                aria-label="Require MFA for staff"
              />
            </CardContent>
          </Card>

          {canEdit && (
            <Button disabled={saveSecurityMutation.isPending} onClick={() => saveSecurityMutation.mutate()}>
              {saveSecurityMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save security settings"
              )}
            </Button>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Save */}
      <AlertDialog open={openSaveConfirm} onOpenChange={setOpenSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save tenant settings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update currency, white-label options, and branding for this tenant. All users in this organization will see the new settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmSave()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Restore defaults */}
      <AlertDialog open={openRestoreConfirm} onOpenChange={setOpenRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore to defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset currency to GHS and clear all white-label options (custom name, logo, primary color, favicon). The tenant will use the default uventorybiz branding. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreMutation.mutate()}
              disabled={restoreMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring…
                </>
              ) : (
                "Restore defaults"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileNav />
    </div>
  );
}
