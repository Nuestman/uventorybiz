import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { SuperAdminPrintDocumentStyles } from "@/components/SuperAdminPrintDocumentStyles";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/lib/appVersion";
import { ensureSourceSans3Loaded } from "@/lib/ensureSourceSans3";
import { SUPER_ADMIN_PRINT_DOCUMENT_BODY_CLASS } from "@/lib/superAdminPrintDocument";
import { cn } from "@/lib/utils";

const uventorybizLogoFull = "/public/logos/uventorybiz-logo-full.png";

const fontHeading: CSSProperties = { fontFamily: '"Odibee Sans", cursive', letterSpacing: "0.04em" };
const fontSans: CSSProperties = { fontFamily: "'Source Sans 3', system-ui, sans-serif" };

const PHASES: { phase: string; purpose: string; activities: string }[] = [
  {
    phase: "Discovery",
    purpose: "Align on pain points, sites, and compliance themes",
    activities: "Workshops with medical, safety, and IT; review current tools and data flows",
  },
  {
    phase: "Pilot",
    purpose: "Prove value on a bounded footprint",
    activities:
      "One tenant (or one primary site), defined roles and modules, success metrics (e.g. time-to-record, adoption)",
  },
  {
    phase: "Rollout",
    purpose: "Scale to additional sites / contractors",
    activities: "Additional tenants or hierarchy expansion, training waves, integration backlog",
  },
  {
    phase: "Steady state",
    purpose: "Operate and evolve",
    activities: "Releases aligned to product roadmap; optional enhancement backlog",
  },
];

const WHY_ROWS: { theme: string; benefit: string }[] = [
  {
    theme: "Built for mining",
    benefit: "Workflows reflect site reality, not only outpatient care.",
  },
  {
    theme: "One platform",
    benefit: "Fewer fragile integrations between clinical, safety, and logistics data.",
  },
  {
    theme: "Trust",
    benefit: "Multi-tenant isolation, RBAC, audit logging aligned to serious operations.",
  },
  {
    theme: "Modern stack",
    benefit: "Maintainable, deployable, extensible architecture.",
  },
];

function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      style={fontHeading}
      className={cn(
        "text-2xl md:text-[1.65rem] text-[#142F5C] mt-10 mb-4 pb-2 border-b-2 border-[#F6621E]/80 print:text-black print:border-[#F6621E]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return (
    <p className="text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt] print:leading-[1.45]">
      {children}
    </p>
  );
}

export default function SuperAdminBusinessProposal() {
  useEffect(() => {
    ensureSourceSans3Loaded();
  }, []);

  useEffect(() => {
    document.body.classList.add(SUPER_ADMIN_PRINT_DOCUMENT_BODY_CLASS);
    return () => document.body.classList.remove(SUPER_ADMIN_PRINT_DOCUMENT_BODY_CLASS);
  }, []);

  return (
    <>
      <SuperAdminPrintDocumentStyles />

      <div className="super-admin-print-toolbar flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <Button variant="outline" size="sm" asChild>
          <Link href="/super-admin/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-[#142F5C] hover:bg-[#142F5C]/90"
          onClick={() => window.print()}
        >
          <Printer className="h-4 w-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>

      <article
        className="mx-auto max-w-[48rem] bg-white rounded-2xl border border-gray-200/80 shadow-sm px-6 py-8 sm:px-10 sm:py-10 md:px-12 md:py-12 print:max-w-none print:rounded-none print:shadow-none print:border-0 print:px-0 print:py-0"
        style={fontSans}
      >
        <header className="text-center border-b border-gray-200 pb-8 mb-2 print:pb-6">
          <img
            src={uventorybizLogoFull}
            alt="MineAid Health Management System"
            className="h-12 sm:h-14 w-auto max-w-[min(100%,280px)] object-contain mx-auto mb-4"
          />
          <h1 style={fontHeading} className="text-2xl sm:text-3xl text-[#142F5C] tracking-wide print:text-black">
            Business proposal
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-gray-700">
            Enterprise health information management for mining operations
          </p>
          <p className="mt-4 text-sm text-gray-600 italic max-w-xl mx-auto leading-relaxed">
            Confidential — qualified partners and prospects · April 2026
          </p>
        </header>

        <section>
          <SectionTitle className="mt-8">1. Executive summary</SectionTitle>
          <Prose>
            MineAid HMS is a <strong>production-ready, multi-tenant platform</strong> for{" "}
            <strong>health information management (HIM)</strong> tailored to mining: on-site clinics, contractors,
            rotating crews, emergency medical response, and the safety and compliance expectations that surround them.
          </Prose>
          <p className="mt-4 text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt] print:leading-[1.45]">
            This proposal outlines <strong>why</strong> a mine-specific system matters, <strong>what</strong> MineAid
            delivers today (aligned to the current product baseline), <strong>how</strong> we typically engage from first
            conversation to scaled rollout, and <strong>how</strong> commercial structures are usually framed—without
            substituting a signed statement of work or contract; those remain subject to mutual agreement.
          </p>
        </section>

        <section>
          <SectionTitle>2. Context: the problem we solve</SectionTitle>
          <Prose>
            Mining organisations routinely manage health and safety information across{" "}
            <strong>many disconnected channels</strong>: clinical records, incident systems, spreadsheets for testing
            programmes, paper or ad hoc ambulance checks, and policy documents in shared drives.
          </Prose>
          <p className="mt-4 text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt]">
            That fragmentation drives: <strong>slower response</strong> when clinical and safety data are not in one
            operational picture; <strong>weaker governance</strong> when audit trails and role boundaries are inconsistent;{" "}
            <strong>higher risk</strong> when proving <strong>duty of care</strong> across employees and contractors under
            scrutiny.
          </p>
          <p className="mt-4 text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt] print:leading-[1.45]">
            Generic hospital-centric EMRs rarely reflect <strong>fitness-for-duty</strong>,{" "}
            <strong>referral to site-configured facilities</strong>, <strong>multi-company workforces</strong>, or{" "}
            <strong>ambulance and stock</strong> in the same workflow layer.
          </p>
        </section>

        <section>
          <SectionTitle>3. Proposed solution: MineAid HMS</SectionTitle>
          <Prose>
            MineAid HMS provides <strong>tenant-isolated</strong>, <strong>role-based</strong> access to a{" "}
            <strong>single system</strong> spanning:
          </Prose>
          <ul className="mt-4 space-y-3 text-[1.05rem] md:text-[1.1rem] text-gray-800 print:text-[11pt] list-disc pl-6 leading-relaxed">
            <li>
              <strong>Clinical &amp; occupational health</strong> — patients, medical visits, appointments, records,
              referrals and disposition, extended health-profile fields where enabled.
            </li>
            <li>
              <strong>Safety &amp; operations</strong> — incidents, operational duties, assignment history, reporting,
              staff ticketing.
            </li>
            <li>
              <strong>Response &amp; supply</strong> — Ambulance &amp; EMS (fleet, pre-start, unit detail, on-board
              inventory and transfers), inventory and procurement flows, equipment tracking, on-site testing scheduling
              and reporting.
            </li>
            <li>
              <strong>People &amp; governance</strong> — Employee wellbeing tools, published <strong>SOP library</strong>{" "}
              with admin authoring (versioning and approval), tenant administration, audit logging, and a{" "}
              <strong>patient portal foundation</strong> with a documented direction toward <strong>offline/sync</strong>{" "}
              for low-connectivity environments.
            </li>
          </ul>
          <p className="mt-4 text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt] print:leading-[1.45]">
            Technical baseline (high level): <strong>React / TypeScript</strong> client, <strong>Express</strong> API,{" "}
            <strong>PostgreSQL</strong> with <strong>Drizzle ORM</strong>, session-based security, patterns suitable for
            cloud deployment (e.g. Vercel, Neon, object storage for attachments)—as implemented in the current codebase.
          </p>
        </section>

        <section className="break-inside-avoid">
          <SectionTitle>4. Scope of supply (product, not custom SOW)</SectionTitle>
          <Prose>
            Unless otherwise agreed in writing, <strong>delivery is the MineAid HMS software platform</strong> as released,
            plus standard <strong>tenant provisioning</strong>, <strong>configuration</strong> (roles, locations, referral
            facilities, modules enabled), <strong>training</strong> appropriate to the phase, and <strong>support</strong>{" "}
            per the agreed tier.
          </Prose>
          <p className="mt-4 text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt] print:leading-[1.45]">
            <strong>Explicitly out of scope</strong> unless separately contracted: bespoke development, third-party
            clinical device integration, legal or regulatory sign-off on your behalf, and data migration from legacy
            systems beyond agreed assistance.
          </p>
        </section>

        <section className="break-inside-avoid">
          <SectionTitle>5. Engagement model (typical phases)</SectionTitle>
          <p className="text-[1.05rem] md:text-[1.1rem] text-gray-800 mb-4 print:text-[11pt]">
            Timelines are <strong>indicative</strong> and depend on client readiness, data migration complexity, and
            integration scope.
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200 print:border-gray-400">
            <table className="w-full text-left text-sm md:text-[0.95rem] border-collapse">
              <thead>
                <tr className="bg-[#142F5C] text-white print:bg-[#142F5C]">
                  <th scope="col" className="py-3 px-3 font-semibold w-[18%] border-b border-white/20" style={fontSans}>
                    Phase
                  </th>
                  <th scope="col" className="py-3 px-3 font-semibold w-[32%] border-b border-white/20" style={fontSans}>
                    Purpose
                  </th>
                  <th scope="col" className="py-3 px-3 font-semibold border-b border-white/20" style={fontSans}>
                    Typical activities
                  </th>
                </tr>
              </thead>
              <tbody>
                {PHASES.map((row, i) => (
                  <tr
                    key={row.phase}
                    className={i % 2 === 0 ? "bg-gray-50/80 print:bg-white" : "bg-white print:bg-gray-50"}
                  >
                    <th
                      scope="row"
                      className="py-3 px-3 align-top font-semibold text-[#142F5C] border-t border-gray-200 print:border-gray-300"
                      style={fontSans}
                    >
                      {row.phase}
                    </th>
                    <td className="py-3 px-3 align-top text-gray-800 border-t border-gray-200 print:border-gray-300 leading-relaxed">
                      {row.purpose}
                    </td>
                    <td className="py-3 px-3 align-top text-gray-800 border-t border-gray-200 print:border-gray-300 leading-relaxed">
                      {row.activities}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SectionTitle>6. Commercial framework (illustrative)</SectionTitle>
          <Prose>
            Commercial terms are <strong>agreed per operator</strong>. Common dimensions include:
          </Prose>
          <ul className="mt-4 space-y-2 text-[1.05rem] md:text-[1.1rem] text-gray-800 print:text-[11pt] list-disc pl-6 leading-relaxed">
            <li>
              <strong>Tenancy</strong> — sites or organisational units modelled as tenants.
            </li>
            <li>
              <strong>Users</strong> — active seats or role bundles (medical, safety, admin, EMT, etc.).
            </li>
            <li>
              <strong>Plan tier</strong> — alignment to feature sets (e.g. Basic / Premium / Enterprise style plans where
              applicable).
            </li>
            <li>
              <strong>Support &amp; SLA</strong> — response targets, named contacts, release communication.
            </li>
          </ul>
          <p className="mt-4 text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 font-medium print:text-[11pt]">
            No pricing appears in this template document; proposals with numbers are issued under commercial control and
            NDA as appropriate.
          </p>
        </section>

        <section>
          <SectionTitle>7. Assumptions &amp; dependencies</SectionTitle>
          <ul className="space-y-2 text-[1.05rem] md:text-[1.1rem] text-gray-800 print:text-[11pt] list-disc pl-6 leading-relaxed">
            <li>Client provides timely access to stakeholders and test environments where needed.</li>
            <li>
              Client is responsible for clinical governance, local regulatory interpretation, and end-user policies on
              their side.
            </li>
            <li>Connectivity and identity decisions (e.g. SSO) are agreed during discovery if required.</li>
            <li>
              Product capabilities evolve; roadmap items (e.g. deeper offline-first) are documented separately from this
              baseline proposal.
            </li>
          </ul>
        </section>

        <section className="break-inside-avoid">
          <SectionTitle>8. Why MineAid (summary)</SectionTitle>
          <div className="overflow-x-auto rounded-lg border border-gray-200 print:border-gray-400">
            <table className="w-full text-left text-sm md:text-[0.95rem] border-collapse">
              <thead>
                <tr className="bg-[#142F5C] text-white print:bg-[#142F5C]">
                  <th scope="col" className="py-3 px-4 font-semibold w-[30%] border-b border-white/20" style={fontSans}>
                    Theme
                  </th>
                  <th scope="col" className="py-3 px-4 font-semibold border-b border-white/20" style={fontSans}>
                    Benefit
                  </th>
                </tr>
              </thead>
              <tbody>
                {WHY_ROWS.map((row, i) => (
                  <tr
                    key={row.theme}
                    className={i % 2 === 0 ? "bg-gray-50/80 print:bg-white" : "bg-white print:bg-gray-50"}
                  >
                    <th
                      scope="row"
                      className="py-3 px-4 align-top font-semibold text-[#142F5C] border-t border-gray-200 print:border-gray-300"
                      style={fontSans}
                    >
                      {row.theme}
                    </th>
                    <td className="py-3 px-4 align-top text-gray-800 border-t border-gray-200 print:border-gray-300 leading-relaxed">
                      {row.benefit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="break-inside-avoid">
          <SectionTitle>9. Next steps &amp; acceptance</SectionTitle>
          <ol className="space-y-3 text-[1.05rem] md:text-[1.1rem] text-gray-800 print:text-[11pt] list-decimal pl-6 leading-relaxed">
            <li>
              <strong>Structured demonstration</strong> of MineAid HMS against your stated HIM and safety priorities.
            </li>
            <li>
              <strong>Pilot definition</strong> — scope, success criteria, timeline, and responsible parties.
            </li>
            <li>
              <strong>Commercial and legal</strong> — order form or contract, data processing terms as required.
            </li>
          </ol>
          <p className="mt-6 text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt]">
            <strong className="text-[#142F5C]">Contact:</strong> public{" "}
            <Link
              href="/contacts"
              className="text-[#F6621E] font-semibold underline underline-offset-2 hover:text-[#d95518] print:text-black print:no-underline"
            >
              Contact
            </Link>{" "}
            page on the MineAid HMS site, or your MineAid relationship owner.
          </p>
        </section>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-600 leading-relaxed print:mt-8 print:text-[9pt]">
          <p className="italic">
            Reference: <code className="text-xs bg-gray-100 px-1 rounded print:bg-transparent not-italic">docs/MINEAID_ENTERPRISE_CONCEPT_NOTE.md</code>
            ; product <span className="font-mono not-italic">v{APP_VERSION}</span> and modules{" "}
            <code className="text-xs bg-gray-100 px-1 rounded print:bg-transparent">docs/VERSION.md</code>,{" "}
            <code className="text-xs bg-gray-100 px-1 rounded print:bg-transparent">docs/IMPLEMENTATION_STATUS.md</code>.
          </p>
        </footer>
      </article>
    </>
  );
}
