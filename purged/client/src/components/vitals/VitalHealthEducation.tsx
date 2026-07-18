import { ExternalLink, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VITAL_METRIC_MAP, type VitalMetricKey } from "@/lib/vitals/vitalsConfig";

type VitalHealthEducationProps = {
  metricKey: VitalMetricKey;
};

export function VitalHealthEducation({ metricKey }: VitalHealthEducationProps) {
  const def = VITAL_METRIC_MAP[metricKey];
  const { education } = def;

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-4 w-4 text-mineaid-navy" />
          About {def.label.toLowerCase()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>{education.summary}</p>
        {education.normalRange ? (
          <div>
            <p className="font-medium text-gray-900 mb-1">Typical range</p>
            <p>{education.normalRange}</p>
          </div>
        ) : null}
        <div>
          <p className="font-medium text-gray-900 mb-1">Why it matters</p>
          <p>{education.whyItMatters}</p>
        </div>
        {education.howItsMeasured ? (
          <div>
            <p className="font-medium text-gray-900 mb-1">How it&apos;s measured</p>
            <p>{education.howItsMeasured}</p>
          </div>
        ) : null}
        {education.whenToSeekCare ? (
          <div>
            <p className="font-medium text-gray-900 mb-1">When to seek care</p>
            <p>{education.whenToSeekCare}</p>
          </div>
        ) : null}
        {education.unitNote ? (
          <div className="rounded-md bg-white border border-amber-200 px-3 py-2">
            <p className="font-medium text-gray-900 mb-1">Units & conversion</p>
            <p>{education.unitNote}</p>
          </div>
        ) : null}
        {education.tips.length > 0 ? (
          <div>
            <p className="font-medium text-gray-900 mb-1">Practical tips</p>
            <ul className="list-disc pl-5 space-y-1.5">
              {education.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {education.links.length > 0 ? (
          <div>
            <p className="font-medium text-gray-900 mb-2">Learn more</p>
            <ul className="space-y-2">
              {education.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-mineaid-navy hover:underline font-medium"
                  >
                    {link.label}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Alert className="bg-white border-amber-200">
          <AlertDescription className="text-xs text-muted-foreground">
            This information is for general education only and does not replace advice from your clinician. Contact your
            occupational health team or emergency services if you have urgent symptoms.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
