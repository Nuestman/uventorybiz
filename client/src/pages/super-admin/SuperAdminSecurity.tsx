import { ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SuperAdminSecurity() {
  return (
    <div className="max-w-[900px] mx-auto px-4 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#142F5C] mb-2">Security & access</h1>
        <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
          How this deployment approaches authentication, isolation, and auditability. For tenant day-to-day audit
          history, use each organisation&apos;s in-app audit trail.
        </p>
      </div>

      <div className="space-y-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-[#142F5C]">Sessions & transport</CardTitle>
            <CardDescription>Aligned with current server behaviour.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-2 list-disc pl-5">
            <li>Authenticated sessions use HTTP-only cookies; API calls use credentials included with same-site rules.</li>
            <li>In production, cookies are marked secure; development may use relaxed same-site for local testing.</li>
            <li>Prefer HTTPS in production so session tokens and payloads are protected in transit.</li>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-[#142F5C]">Roles & tenant isolation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-2 list-disc pl-5">
            <li>RBAC is enforced on both client route guards and server middleware; sensitive routes require the appropriate staff roles.</li>
            <li>Tenant data is scoped by <code className="text-xs bg-slate-100 px-1 rounded">tenant_id</code> in storage and APIs.</li>
            <li>Platform super-admin accounts (no tenant) use separate console routes and APIs.</li>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-[#142F5C]">Audit & support impersonation</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-3">
            <p>
              Sensitive actions write to tenant <code className="text-xs bg-slate-100 px-1 rounded">audit_logs</code> where
              applicable. Support impersonation is explicit, restricted to active tenant users, and logged at platform and
              tenant levels.
            </p>
            <p>
              <Link
                href="/super-admin/impersonation-log"
                className="font-medium text-[#142F5C] underline-offset-2 hover:underline inline-flex items-center gap-1"
              >
                Impersonation log <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </p>
            <p className="text-slate-600">
              Operator reference in the repo: <code className="text-xs">docs/IMPERSONATION.md</code>.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-[#142F5C]">Public policies</CardTitle>
            <CardDescription>End-user legal and security pages in this app.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 text-sm">
            <Link href="/privacy" className="text-[#142F5C] font-medium underline-offset-2 hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="text-[#142F5C] font-medium underline-offset-2 hover:underline">
              Terms
            </Link>
            <Link href="/security" className="text-[#142F5C] font-medium underline-offset-2 hover:underline">
              Security
            </Link>
            <Link href="/legal" className="text-[#142F5C] font-medium underline-offset-2 hover:underline">
              Legal hub
            </Link>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base text-[#142F5C]">RBAC reference</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            <p>
              Role semantics and route requirements: <code className="text-xs bg-slate-100 px-1 rounded">docs/RBAC.md</code>{" "}
              in the repository.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
