import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type IntegrationsStatusPayload = {
  email: { resend: boolean; gmailSmtp: boolean };
  sms: { twilio: boolean };
  blob: { vercelBlob: boolean };
};

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <Badge variant={ok ? "default" : "secondary"} className="font-normal">
      {ok ? "Configured" : "Not configured"}
    </Badge>
  );
}

export default function SuperAdminIntegrations() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/super-admin/integrations-status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/super-admin/integrations-status");
      return res.json() as Promise<IntegrationsStatusPayload>;
    },
  });

  return (
    <div className="max-w-[900px] mx-auto px-4 lg:px-8 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#142F5C] mb-2">Integrations</h1>
          <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
            Whether optional providers are present in this deployment&apos;s environment. Values are boolean flags only; API
            keys and secrets are never returned.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="text-sm font-medium text-[#142F5C] underline-offset-2 hover:underline disabled:opacity-50"
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-slate-600 py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading…
        </div>
      )}

      {isError && (
        <p className="text-red-600 text-sm py-4">
          {error instanceof Error ? error.message : "Failed to load integrations."}
        </p>
      )}

      {data && (
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base text-[#142F5C]">Email</CardTitle>
              <CardDescription>Transactional email (invitations, notifications).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-700">Resend API</span>
                <StatusBadge ok={data.email.resend} />
              </div>
              <p className="text-xs text-slate-500">
                When Resend credentials and from-address are set, production-style sends use the Resend API.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-700">Gmail SMTP</span>
                <StatusBadge ok={data.email.gmailSmtp} />
              </div>
              <p className="text-xs text-slate-500">Optional local/dev path when Gmail app password variables are set.</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base text-[#142F5C]">SMS</CardTitle>
              <CardDescription>Optional Twilio integration.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-700">Twilio (account, token, from number)</span>
              <StatusBadge ok={data.sms.twilio} />
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base text-[#142F5C]">Object storage</CardTitle>
              <CardDescription>Optional Vercel Blob token for hosted file features.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-slate-700">BLOB_READ_WRITE_TOKEN</span>
              <StatusBadge ok={data.blob.vercelBlob} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
