import path from "path";
import { readFileSync } from "fs";
import { legalMarkdownToSafeHtml } from "./legalDocHtml";

export type LegalDocumentId =
  | "commercial-agreement"
  | "data-processing-addendum"
  | "subprocessors"
  | "baa-template";

export type LegalDocumentMeta = {
  id: LegalDocumentId;
  title: string;
  description: string;
  /** File name under docs/ */
  file: string;
};

export const LEGAL_DOCUMENT_INDEX: LegalDocumentMeta[] = [
  {
    id: "commercial-agreement",
    title: "Commercial Agreement (subscription)",
    description:
      "Master subscription terms for uventorybiz—fees, term, data, security, and signature blocks for physical or e-sign execution.",
    file: "COMMERCIAL_AGREEMENT.md",
  },
  {
    id: "data-processing-addendum",
    title: "Data Processing Addendum",
    description:
      "Processor obligations, sub-processing, cross-border transfers, and breach notification—use alongside the Commercial Agreement where regulated personal or health data applies.",
    file: "DATA_PROCESSING_ADDENDUM.md",
  },
  {
    id: "baa-template",
    title: "Business Associate Agreement (template)",
    description:
      "HIPAA-style BAA template for U.S. covered entities or business associates using the Service with PHI. Execute only when legally required and after counsel review.",
    file: "BUSINESS_ASSOCIATE_AGREEMENT_TEMPLATE.md",
  },
  {
    id: "subprocessors",
    title: "Subprocessors & infrastructure",
    description:
      "Transparency list of typical infrastructure and service providers (hosting, database, email, file storage). Update with your live stack before customer distribution.",
    file: "SUBPROCESSORS.md",
  },
];

const ID_TO_META = new Map<LegalDocumentId, LegalDocumentMeta>(
  LEGAL_DOCUMENT_INDEX.map((d) => [d.id, d])
);

export function getLegalDocumentMeta(id: string): LegalDocumentMeta | null {
  if (!ID_TO_META.has(id as LegalDocumentId)) return null;
  return ID_TO_META.get(id as LegalDocumentId)!;
}

export function readLegalDocumentMarkdown(fileName: string): string {
  const filePath = path.join(process.cwd(), "docs", fileName);
  return readFileSync(filePath, "utf-8");
}

export function buildLegalDocumentPayload(id: string): {
  id: LegalDocumentId;
  title: string;
  description: string;
  html: string;
} | null {
  const meta = getLegalDocumentMeta(id);
  if (!meta) return null;
  const md = readLegalDocumentMarkdown(meta.file);
  const html = legalMarkdownToSafeHtml(md);
  return {
    id: meta.id,
    title: meta.title,
    description: meta.description,
    html,
  };
}
