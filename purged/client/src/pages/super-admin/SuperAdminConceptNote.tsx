import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Printer } from "lucide-react";
import { SuperAdminPrintDocumentStyles } from "@/components/SuperAdminPrintDocumentStyles";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/lib/appVersion";
import { ensureSourceSans3Loaded } from "@/lib/ensureSourceSans3";
import { SUPER_ADMIN_PRINT_DOCUMENT_BODY_CLASS } from "@/lib/superAdminPrintDocument";

const uventorybizLogoFull = "/public/logos/uventorybiz-logo-full.png";

const fontHeading: CSSProperties = { fontFamily: '"Odibee Sans", cursive', letterSpacing: "0.04em" };
const fontSans: CSSProperties = { fontFamily: "'Source Sans 3', system-ui, sans-serif" };

const DIFFERENTIATORS: { pillar: string; detail: string }[] = [
  {
    pillar: "Built for mining",
    detail:
      "Workflows reflect site clinics, fitness-for-duty, transfers to referral facilities, and safety—not only outpatient care.",
  },
  {
    pillar: "One platform",
    detail:
      "Clinical, safety, logistics, and governance modules share one data model and navigation; fewer integrations to bolt on.",
  },
  {
    pillar: "Trust & compliance",
    detail:
      "Multi-tenant isolation, RBAC (including clinical vs safety-officer boundaries where configured), and audit trails aligned to serious operations.",
  },
  {
    pillar: "Enterprise-ready stack",
    detail:
      "Modern web application (React, TypeScript, PostgreSQL, Express), suitable for cloud deployment and controlled scale-out.",
  },
];

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={fontHeading}
      className="text-2xl md:text-[1.65rem] text-[#142F5C] mt-10 mb-4 pb-2 border-b-2 border-[#F6621E]/80 print:text-black print:border-[#F6621E]"
    >
      {children}
    </h2>
  );
}

export default function SuperAdminConceptNote() {
  useEffect(() => {
    ensureSourceSans3Loaded();
  }, []);

  useEffect(() => {
    document.body.classList.add(SUPER_ADMIN_PRINT_DOCUMENT_BODY_CLASS);
    return () => document.body.classList.remove(SUPER_ADMIN_PRINT_DOCUMENT_BODY_CLASS);
  }, []);

  const handlePrint = () => {
    window.print();
  };

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
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" className="bg-[#142F5C] hover:bg-[#142F5C]/90" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print / Save as PDF
          </Button>
        </div>
      </div>

      <article
        className="concept-note-document mx-auto max-w-[48rem] bg-white rounded-2xl border border-gray-200/80 shadow-sm px-6 py-8 sm:px-10 sm:py-10 md:px-12 md:py-12 print:max-w-none print:rounded-none print:shadow-none print:border-0 print:px-0 print:py-0"
        style={fontSans}
      >
        <header className="text-center border-b border-gray-200 pb-8 mb-2 print:pb-6">
          <img
            src={uventorybizLogoFull}
            alt="MineAid Health Management System"
            className="h-12 sm:h-14 w-auto max-w-[min(100%,280px)] object-contain mx-auto mb-5"
          />
          <p className="text-sm sm:text-base font-semibold text-[#142F5C] tracking-wide uppercase print:text-black">
            Health information management for mining operations
          </p>
          <p className="mt-3 text-sm text-gray-600 italic max-w-xl mx-auto leading-relaxed">
            Confidential — for qualified mining operators and partners · April 2026
          </p>
        </header>

        <section>
          <SectionTitle>Executive summary</SectionTitle>
          <p className="text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt] print:leading-[1.45]">
            <strong className="text-[#142F5C] font-semibold">MineAid HMS</strong> is a production-grade, multi-tenant{" "}
            <strong>health information management (HIM)</strong> platform built for the reality of mine sites: rotating
            crews, contractor firms, on-site clinics, emergency response, and regulators who expect{" "}
            <strong>traceable decisions and auditable records</strong>. It unifies clinical workflows, occupational
            health, incident and safety reporting, ambulance and EMS operations, inventory and equipment, employee
            wellbeing, and governed procedures (SOPs) in <strong>one secure system</strong>—instead of disconnected
            spreadsheets, paper, and generic hospital EMRs that were never designed for extraction or processing
            environments.
          </p>
        </section>

        <section>
          <SectionTitle>Problem</SectionTitle>
          <p className="text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt] print:leading-[1.45]">
            Mining operators still struggle with <strong>fragmented health and safety data</strong>: patient and visit
            records in one place, incidents in another, drug-and-alcohol or hydration programmes in spreadsheets,
            ambulance checks on clipboards, and policies in shared drives. That fragmentation increases{" "}
            <strong>latency in emergencies</strong>, weakens <strong>oversight and compliance</strong>, and makes it hard
            to prove <strong>duty of care</strong> across the workforce—including contractors—when it matters most.
          </p>
        </section>

        <section>
          <SectionTitle>Proposed solution</SectionTitle>
          <p className="text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt] print:leading-[1.45]">
            MineAid HMS delivers <strong>tenant-isolated, role-based access</strong> to a single operational medical
            record and operations layer for each site or corporate deployment. The product is <strong>live and modular</strong>
            : patient registration and medical visits, appointments, records, incidents, operational duties, reporting,
            on-site testing programmes, full <strong>Ambulance &amp; EMS</strong> (fleet, pre-start, unit-level inventory),{" "}
            <strong>inventory and procurement</strong> flows, <strong>staff ticketing</strong>, <strong>employee wellbeing</strong>{" "}
            wellbeing tools, a <strong>published SOP library</strong> with admin authoring, <strong>audit logging</strong>,
            tenant administration, and a <strong>patient portal foundation</strong>—with a documented roadmap toward{" "}
            <strong>offline/sync</strong> for field and constrained connectivity.
          </p>
        </section>

        <section className="break-inside-avoid">
          <SectionTitle>Why MineAid (differentiators)</SectionTitle>
          <div className="overflow-x-auto rounded-lg border border-gray-200 print:border-gray-400">
            <table className="w-full text-left text-sm md:text-[0.95rem] border-collapse">
              <thead>
                <tr className="bg-[#142F5C] text-white print:bg-[#142F5C]">
                  <th
                    scope="col"
                    className="py-3 px-4 font-semibold w-[28%] border-b border-white/20 print:border-gray-600"
                    style={fontSans}
                  >
                    Pillar
                  </th>
                  <th scope="col" className="py-3 px-4 font-semibold border-b border-white/20 print:border-gray-600" style={fontSans}>
                    What mining companies get
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIFFERENTIATORS.map((row, i) => (
                  <tr
                    key={row.pillar}
                    className={i % 2 === 0 ? "bg-gray-50/80 print:bg-white" : "bg-white print:bg-gray-50"}
                  >
                    <th
                      scope="row"
                      className="py-3 px-4 align-top font-semibold text-[#142F5C] border-t border-gray-200 print:border-gray-300"
                      style={fontSans}
                    >
                      {row.pillar}
                    </th>
                    <td className="py-3 px-4 align-top text-gray-800 border-t border-gray-200 print:border-gray-300 leading-relaxed">
                      {row.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <SectionTitle>Commercial framing (illustrative)</SectionTitle>
          <p className="text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt] print:leading-[1.45]">
            Engagements typically follow <strong>discovery → pilot site → enterprise rollout</strong>: tenant provisioning,
            role design, data migration where applicable, training for medical, safety, and admin roles, and ongoing
            roadmap alignment (e.g. deeper integrations, analytics, offline-first). Pricing and SLA are structured
            around <strong>tenants (sites)</strong>, active users, and support tier—details are agreed per operator.
          </p>
        </section>

        <section className="break-inside-avoid">
          <SectionTitle>Ask &amp; next steps</SectionTitle>
          <p className="text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt] print:leading-[1.45]">
            We invite mining companies and mine-health leads to a <strong>structured demonstration</strong> of MineAid
            HMS against their current HIM and safety reporting pain points, followed by a <strong>pilot definition</strong>{" "}
            (scope, success metrics, timeline).
          </p>
          <p className="mt-4 text-[1.05rem] md:text-[1.1rem] leading-relaxed text-gray-800 print:text-[11pt]">
            <strong className="text-[#142F5C]">Contact:</strong> use the public{" "}
            <Link href="/contacts" className="text-[#F6621E] font-semibold underline underline-offset-2 hover:text-[#d95518] print:text-black print:no-underline">
              Contact
            </Link>{" "}
            page on the MineAid HMS site or your existing MineAid relationship owner.
          </p>
        </section>

        <footer className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-600 leading-relaxed print:mt-8 print:text-[9pt]">
          <p className="italic">
            MineAid HMS — &ldquo;Production-ready multi-tenant healthcare management for mining operations.&rdquo; Current
            product build <span className="font-mono not-italic">v{APP_VERSION}</span>; module status in repository{" "}
            <code className="text-xs bg-gray-100 px-1 rounded print:bg-transparent">docs/VERSION.md</code> and{" "}
            <code className="text-xs bg-gray-100 px-1 rounded print:bg-transparent">docs/IMPLEMENTATION_STATUS.md</code>.
          </p>
        </footer>
      </article>
    </>
  );
}
