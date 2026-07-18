/**
 * Privacy policy content for Nuestman Tech Solutions / uventorybiz.
 * Aligned with docs/PRIVACY_POLICY.md. Satisfies GDPR, HIPAA, and Ghana Data Protection Act 843.
 */

/** Phone number for wa.me (no spaces or +) */
const PHONE_E164 = "233206484034";
const WHATSAPP_PREFILL = "Hello, I have an enquiry about uventorybiz.";

export const PRIVACY_CONTACT = {
  orgName: "Nuestman Tech Solutions",
  /** Registered with Ghana ORC and DPC under this name */
  registeredName: "Nuestman Links Enterprise",
  address: "AN758, Ivory Street, MVSS 27, Moinsi Valley Estate",
  email: "nuestman@icloud.com",
  phone: "+233 20 648 4034",
  phoneE164: PHONE_E164,
  whatsappUrl: `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(WHATSAPP_PREFILL)}`,
} as const;

export interface PrivacySection {
  id: string;
  title: string;
  paragraphs: string[];
}

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: "controller",
    title: "1. Data controller and contact",
    paragraphs: [
      "Data controller: Nuestman Tech Solutions. We are registered with the Office of the Registrar of Companies (ORC), Ghana, as Nuestman Links Enterprise, and the same entity is registered with the Data Protection Commission (DPC) for data protection compliance.",
      "Address: AN758, Ivory Street, MVSS 27, Moinsi Valley Estate. For privacy requests, complaints, or questions (including data subject rights and, where applicable, HIPAA or Data Protection Commission matters), please use the contact details below.",
      "Under Ghana's Data Protection Act, 2012 (Act 843), we are registered with the Data Protection Commission and ensure that our processing of personal data complies with the Act.",
    ],
  },
  {
    id: "data-we-collect",
    title: "2. Personal data we collect and why",
    paragraphs: [
      "Account and administrative data: We collect name, email address, role, and similar identifiers for user accounts and tenant administration. Legal basis (GDPR): Contract and legitimate interest. Under Ghana Act 843, processing is in accordance with the data protection principles.",
      "Business and operational data: When the Service is used for business operations, we may process employee, customer, and supplier data (e.g. identities, orders, incidents, wellbeing records, drug/alcohol testing) and data about personnel. This may include Protected Health Information (PHI) as defined under HIPAA when the Service is used by or on behalf of a HIPAA-covered entity. Where we act as a business associate, we do so under a Business Associate Agreement (BAA) and in line with HIPAA's Privacy and Security Rules. Legal basis (GDPR): Contract, legal obligation, and/or consent where required. Under Ghana Act 843, sensitive data including health data is handled in line with the Act.",
      "Technical and usage data: We collect logs, IP address, device/browser data, and usage information necessary for security, availability, and support. Legal basis (GDPR): Legitimate interest. We do not sell your personal data.",
    ],
  },
  {
    id: "how-we-use",
    title: "3. How we use personal data",
    paragraphs: [
      "We use the data to provide, operate, and maintain the Service; authenticate users and enforce access control and tenant isolation; comply with legal and regulatory obligations (including under Ghana law and, where applicable, HIPAA); ensure security and prevent abuse; communicate with you about the Service; and improve the Service in line with applicable law. Where we process PHI, we do so only as permitted by our BAA and HIPAA.",
    ],
  },
  {
    id: "legal-basis",
    title: "4. Legal basis for processing (GDPR)",
    paragraphs: [
      "Where GDPR applies: Contract (performance of the service); Legal obligation (compliance with laws); Legitimate interest (security, support, improvement of the Service); Consent (where we rely on it, you may withdraw it at any time).",
    ],
  },
  {
    id: "retention",
    title: "5. Data retention",
    paragraphs: [
      "We retain personal data only for as long as necessary to fulfil the purposes in this policy. Account and administrative data: for the duration of the contract and a reasonable period thereafter. Healthcare/operational data (including PHI): as required by contract or applicable law. Logs and security-related data: as needed for security and compliance. After the retention period, we delete or anonymise data except where we must keep it for legal or regulatory reasons.",
    ],
  },
  {
    id: "rights",
    title: "6. Your rights",
    paragraphs: [
      "GDPR (EEA/UK): You have the right to access, rectification, erasure, restriction, data portability, and to object; you may withdraw consent and lodge a complaint with a supervisory authority.",
      "Ghana's Data Protection Act 843: Data subjects have rights including access, correction, and deletion in accordance with the Act. We will respond in line with the Act and the Data Protection Commission's guidelines.",
      "HIPAA (US): Where HIPAA applies, individuals have rights under the HIPAA Privacy Rule. If we process your PHI as a business associate, those rights are exercised through the covered entity; we support the covered entity as required by our BAA.",
      "To exercise any of these rights, contact us using the details in section 1.",
    ],
  },
  {
    id: "security",
    title: "7. Security and confidentiality",
    paragraphs: [
      "We implement technical and organisational measures including access control (role-based access, strong authentication, tenant isolation); encryption in transit (TLS) and at rest where appropriate; and policies and training on data protection and, where relevant, HIPAA. These measures are aligned with GDPR Article 32, HIPAA Security Rule where we act as a business associate, and Ghana's Data Protection Act 843.",
    ],
  },
  {
    id: "breaches",
    title: "8. Data breaches",
    paragraphs: [
      "GDPR: We will notify the relevant supervisory authority and affected data subjects where a breach is likely to result in a risk to rights and freedoms. Ghana Act 843: We will report serious breaches to the Data Protection Commission as required. HIPAA: Where we are a business associate and a breach affects PHI, we will notify the covered entity in accordance with our BAA and HIPAA breach notification rules.",
    ],
  },
  {
    id: "transfers",
    title: "9. International transfers",
    paragraphs: [
      "Personal data may be processed or stored in countries outside your country of residence. Where we transfer data from the EEA or UK, we ensure appropriate safeguards (e.g. standard contractual clauses). Where we transfer data from Ghana, we comply with cross-border transfer requirements under Act 843. We can provide more detail on request.",
    ],
  },
  {
    id: "dpo-ghana",
    title: "10. Data Protection Supervisor (Ghana Act 843)",
    paragraphs: [
      "In line with Ghana's Data Protection Act 843, we have designated internal oversight for data protection compliance. For enquiries relating to our compliance with Act 843 or to exercise your rights under the Act, please contact us at the details in section 1.",
    ],
  },
  {
    id: "changes",
    title: "11. Changes to this policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. We will post the current version on the Service and indicate the \"Last updated\" date. Material changes may be communicated via the Service or by email. We encourage you to review this policy periodically.",
    ],
  },
  {
    id: "contact",
    title: "12. Contact",
    paragraphs: [
      "Nuestman Tech Solutions, AN758, Ivory Street, MVSS 27, Moinsi Valley Estate. For privacy, data subject rights, or Data Protection Commission–related enquiries, please use the contact details below.",
    ],
  },
];
