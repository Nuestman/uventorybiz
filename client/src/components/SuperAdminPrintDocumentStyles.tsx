import {
  LEGAL_PRINT_DOCUMENT_BODY_CLASS,
  SUPER_ADMIN_PRINT_DOCUMENT_BODY_CLASS,
} from "@/lib/superAdminPrintDocument";

/** Shared @page + body print background for concept note, business proposal, and public legal documents. */
export function SuperAdminPrintDocumentStyles() {
  return (
    <style>
      {`
        @media print {
          @page {
            size: A4;
            margin: 16mm 14mm 18mm 14mm;
          }
          body.${SUPER_ADMIN_PRINT_DOCUMENT_BODY_CLASS},
          body.${LEGAL_PRINT_DOCUMENT_BODY_CLASS} {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}
    </style>
  );
}
