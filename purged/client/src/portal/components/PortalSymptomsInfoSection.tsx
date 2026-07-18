import { Info } from "lucide-react";
import { OPQRST_SECTIONS } from "@/lib/symptoms/symptomCatalog";

export function PortalSymptomsInfoSection() {
  return (
    <div className="portal-info-box space-y-4">
          <h2 className="text-lg text-gray">A few minutes of tracking can go a long way on your next visit</h2>
      <div className="flex gap-2.5">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-[var(--portal-primary,#0d9488)]" aria-hidden />
        <div className="space-y-2 min-w-0">
          <p className="text-sm font-semibold text-gray-900">About symptom reporting</p>
          <p className="text-sm text-gray-700 leading-relaxed">
            Use this tracker to record how you were actually feeling in the moment. Entries use the{" "}
            <strong>OPQRST</strong> structure clinicians use to understand symptoms and are shared
            with your care team. This is not for emergencies — contact your site clinic or emergency
            services if you need urgent help.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {OPQRST_SECTIONS.map((section) => (
          <div
            key={section.letter}
            className="rounded-md border border-gray-200/80 bg-white/80 px-3 py-2.5"
          >
            <p className="text-xs font-semibold text-gray-900">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-[10px] text-teal-900 mr-1.5">
                {section.letter}
              </span>
              {section.title}
            </p>
            <p className="text-[11px] text-mineaid-gray mt-1 leading-snug">{section.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
