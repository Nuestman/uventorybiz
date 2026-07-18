import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, User, KeyRound, Camera, Trash2, HelpCircle } from "lucide-react";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PORTAL_SESSION_QUERY_KEY } from "./usePortalSession";
import { PortalLoadingBlock, PORTAL_PRIMARY_BTN_CLASS, PORTAL_PRIMARY_TEXT_CLASS } from "./portalUi";
import { PortalNotificationPreferencesCard } from "./components/PortalNotificationPreferencesCard";

function LabelWithTip({ label, tip }: { label: string; tip: string }) {
  return (
    <FormLabel className="flex items-center gap-1.5">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`About ${label}`}
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm text-left">
          {tip}
        </TooltipContent>
      </Tooltip>
    </FormLabel>
  );
}

function InlineLabelWithTip({ label, tip }: { label: string; tip: string }) {
  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`About ${label}`}
          >
            <HelpCircle className="h-4 w-4 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-sm text-left">
          {tip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

type PortalMe = {
  features: Record<string, boolean>;
  partyType?: "customer" | "supplier";
  tenant: { id: string; name: string };
  profileImageUrl: string | null;
  patient?: {
    id: string;
    status: string | null;
    allergies: string | null;
    medicalHistory: string | null;
    medications: string | null;
    disability: string | null;
    notes: string | null;
  };
  employee?: {
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phoneNumber: string | null;
    department: string;
    position: string;
    dateOfBirth: string | null;
    gender: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    companyName: string | null;
  };
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    customerNumber: string | null;
  };
  supplier?: {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
  };
  party?: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

function toDateInputValue(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return "";
  const s = String(isoOrDate).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

const employeeSchema = z.object({
  phoneNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export default function PortalProfilePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<PortalMe>({
    queryKey: ["/api/portal/me"],
    queryFn: getQueryFn<PortalMe>({ on401: "throw" }),
  });

  const empForm = useForm<z.infer<typeof employeeSchema>>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      phoneNumber: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      dateOfBirth: "",
    },
  });

  useEffect(() => {
    if (!data?.employee) return;
    empForm.reset({
      phoneNumber: data.employee.phoneNumber ?? "",
      emergencyContactName: data.employee.emergencyContactName ?? "",
      emergencyContactPhone: data.employee.emergencyContactPhone ?? "",
      dateOfBirth: toDateInputValue(data.employee.dateOfBirth),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when /portal/me changes
  }, [data]);

  const pwdForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const saveEmployee = useMutation({
    mutationFn: async (body: z.infer<typeof employeeSchema>) => {
      const payload: Record<string, unknown> = {
        phoneNumber: body.phoneNumber?.trim() || null,
        emergencyContactName: body.emergencyContactName?.trim() || null,
        emergencyContactPhone: body.emergencyContactPhone?.trim() || null,
      };
      const dob = body.dateOfBirth?.trim();
      if (dob === "") payload.dateOfBirth = null;
      else if (dob) payload.dateOfBirth = dob;

      await apiRequest("PUT", "/api/portal/employee-profile", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/portal/me"] });
      qc.invalidateQueries({ queryKey: PORTAL_SESSION_QUERY_KEY });
      toast({ title: "Saved", description: "Your details were updated." });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/portal/profile-photo", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Upload failed");
      }
      return res.json() as Promise<{ ok: boolean; profileImageUrl: string }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/portal/me"] });
      qc.invalidateQueries({ queryKey: PORTAL_SESSION_QUERY_KEY });
      toast({ title: "Photo updated" });
    },
    onError: (e: Error) =>
      toast({ title: "Upload failed", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });

  const removeAvatar = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/portal/profile-photo");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/portal/me"] });
      qc.invalidateQueries({ queryKey: PORTAL_SESSION_QUERY_KEY });
      toast({ title: "Photo removed" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });

  const savePwd = useMutation({
    mutationFn: async (body: z.infer<typeof passwordSchema>) => {
      await apiRequest("POST", "/api/portal/auth/change-password", body);
    },
    onSuccess: () => {
      pwdForm.reset();
      qc.invalidateQueries({ queryKey: PORTAL_SESSION_QUERY_KEY });
      toast({ title: "Password updated", description: "You remain signed in on this device." });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message.replace(/^\d+:\s*/, ""), variant: "destructive" }),
  });

  if (isLoading || !data) {
    return <PortalLoadingBlock label="Loading your profile…" />;
  }

  const canEmp = !!data.employee && data.features.employeeProfile !== false;
  const partyName = data.customer
    ? `${data.customer.firstName} ${data.customer.lastName}`.trim()
    : data.supplier
      ? data.supplier.name
      : data.party
        ? `${data.party.firstName} ${data.party.lastName}`.trim()
        : data.employee
          ? `${data.employee.firstName} ${data.employee.lastName}`.trim()
          : "Your account";

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-8">
      {(data.customer || data.supplier || data.party) && !data.employee && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium text-gray-900">{partyName}</p>
            {data.customer?.email || data.supplier?.email || data.party?.email ? (
              <p className="text-muted-foreground">{data.customer?.email ?? data.supplier?.email ?? data.party?.email}</p>
            ) : null}
            {data.customer?.phone || data.supplier?.phone ? (
              <p className="text-muted-foreground">{data.customer?.phone ?? data.supplier?.phone}</p>
            ) : null}
            {data.customer?.customerNumber ? (
              <p className="text-muted-foreground">Customer #{data.customer.customerNumber}</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start gap-6">
        <div className="flex flex-col items-center sm:items-start gap-3">
          {canEmp && (
            <InlineLabelWithTip
              label="Profile photo"
              tip="Shown here and in staff employee views. Use a clear face photo. Max size follows your organization’s upload limits."
            />
          )}
          <div className="relative h-28 w-28 rounded-full border-2 border-gray-200 bg-gray-100 overflow-hidden shrink-0">
            {data.profileImageUrl ? (
              <img src={data.profileImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                {(data.employee?.firstName?.[0] ?? data.customer?.firstName?.[0] ?? partyName[0] ?? "?")}
                {(data.employee?.lastName?.[0] ?? data.customer?.lastName?.[0] ?? "")}
              </div>
            )}
          </div>
          {canEmp && (
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) uploadAvatar.mutate(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadAvatar.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-1" />
                    {data.profileImageUrl ? "Change photo" : "Add photo"}
                  </>
                )}
              </Button>
              {data.profileImageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  disabled={removeAvatar.isPending}
                  onClick={() => removeAvatar.mutate()}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <User className={`h-7 w-7 ${PORTAL_PRIMARY_TEXT_CLASS}`} />
            Account settings
          </h2>
          <p className="text-uventorybiz-gray mt-1">{partyName}</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-xl">
            Manage notifications, contact details, and account security.
            {data.employee
              ? " Information you submit may be reviewed by staff for accuracy."
              : " Contact your organization to update linked customer or supplier records."}
          </p>
        </div>
      </div>

      <PortalNotificationPreferencesCard />

      {data.employee && (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identity (read-only)</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-uventorybiz-gray text-xs uppercase tracking-wide">Work email</p>
            <p>{data.employee.email || "—"}</p>
          </div>
          <div>
            <p className="text-uventorybiz-gray text-xs uppercase tracking-wide">Department / role</p>
            <p>
              {data.employee.department} · {data.employee.position}
            </p>
          </div>
          <div>
            <p className="text-uventorybiz-gray text-xs uppercase tracking-wide">Gender</p>
            <p>{data.employee.gender || "—"}</p>
          </div>
        </CardContent>
      </Card>
      )}

      {canEmp && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...empForm}>
              <form
                onSubmit={empForm.handleSubmit((v) => saveEmployee.mutate(v))}
                className="space-y-4 max-w-xl"
              >
                <FormField
                  control={empForm.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithTip
                        label="Date of birth"
                        tip="Use the date that matches your official ID or HR records. If it differs from what the business has on file, contact them so records can be aligned."
                      />
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={empForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithTip
                        label="Mobile / phone"
                        tip="Your direct number for calls or SMS from the business. Prefer your main mobile number."
                      />
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={empForm.control}
                  name="emergencyContactName"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithTip
                        label="Emergency contact name"
                        tip="Someone the business can reach if you have an emergency at work—not yourself."
                      />
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={empForm.control}
                  name="emergencyContactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <LabelWithTip
                        label="Emergency contact phone"
                        tip="A reliable phone number for your emergency contact (include country code if needed)."
                      />
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className={PORTAL_PRIMARY_BTN_CLASS}
                  disabled={saveEmployee.isPending}
                >
                  {saveEmployee.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save personal details"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Change password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4 max-w-xl"
            onSubmit={pwdForm.handleSubmit((v) => savePwd.mutate(v))}
          >
            <div className="space-y-2">
              <InlineLabelWithTip
                label="Current password"
                tip="The password you use to sign in to this customer & supplier portal (not your work/staff login if you have one)."
              />
              <Input id="cur-pw" type="password" {...pwdForm.register("currentPassword")} className="mt-1.5" />
              {pwdForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">{pwdForm.formState.errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <InlineLabelWithTip
                label="New password (min 8 characters)"
                tip="Choose a strong password you don’t use elsewhere. After saving, you stay signed in on this device."
              />
              <Input id="new-pw" type="password" {...pwdForm.register("newPassword")} className="mt-1.5" />
              {pwdForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">{pwdForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <Button type="submit" className={PORTAL_PRIMARY_BTN_CLASS} disabled={savePwd.isPending}>
              {savePwd.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
