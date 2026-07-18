import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

/**
 * Shown when a super admin is viewing the app as a tenant user. Exiting restores the platform session.
 */
export function ImpersonationBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const impersonator = user?.impersonator;
  if (!impersonator?.id) return null;

  const operatorLabel =
    [impersonator.firstName, impersonator.lastName].filter(Boolean).join(" ").trim() ||
    impersonator.email ||
    "Platform admin";

  const exit = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/super-admin/impersonation/end");
      const data = (await res.json()) as { redirectTo?: string };
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.cancelQueries({ queryKey: ["/api/auth/user"] });
      queryClient.clear();
      window.location.href = data.redirectTo ?? "/super-admin/dashboard";
    } catch {
      toast({
        title: "Could not exit impersonation",
        description: "Try again or sign out and sign back in.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const viewingAs = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "User";

  return (
    <div
      className="print:hidden flex flex-wrap items-center justify-between gap-3 border-b border-amber-800/40 bg-amber-950 px-4 py-2.5 text-sm text-amber-50"
      role="status"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
        <div className="min-w-0">
          <p className="font-medium leading-snug">Support impersonation</p>
          <p className="text-xs leading-snug text-amber-100/90">
            Viewing as <span className="font-semibold text-amber-50">{viewingAs}</span>. Platform operator:{" "}
            <span className="font-semibold text-amber-50">{operatorLabel}</span>. Actions use this user&apos;s permissions
            and are audited, including the operator identity.
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0 border-amber-200/30 bg-amber-100 text-amber-950 hover:bg-amber-50"
        disabled={loading}
        onClick={() => void exit()}
      >
        {loading ? "Exiting…" : "Exit impersonation"}
      </Button>
    </div>
  );
}
