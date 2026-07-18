import { CLINICAL_REPORTS_PRINT_BODY_CLASS } from "@/lib/clinicalReportsPrint";

/** @page + print color fidelity for clinical report PDF / print output. */
export function ClinicalReportsPrintStyles() {
  return (
    <style>
      {`
        @media print {
          @page {
            size: A4 portrait;
            margin: 14mm 12mm 16mm 12mm;
          }
          body.${CLINICAL_REPORTS_PRINT_BODY_CLASS} {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}
    </style>
  );
}
