import { PRIVACY_CONTACT } from "@/content/privacyPolicy";

export interface TermsSection {
  id: string;
  title: string;
  paragraphs: string[];
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "who",
    title: "1. Who these Terms apply to",
    paragraphs: [
      "These Terms apply to (a) the company, business, or other entity that has entered into a commercial agreement or subscription for uventorybiz, and (b) authorised users who are given access under that organisation’s account.",
      "If you are using the Service on behalf of an organisation, you confirm that you have authority to bind that organisation to these Terms.",
    ],
  },
  {
    id: "regulatory",
    title: "2. Regulatory context (GDPR, HIPAA, Ghana Act 843)",
    paragraphs: [
      "Our use of personal data is governed by our Privacy Policy, which is designed to comply with the EU GDPR, US HIPAA (where applicable), and Ghana’s Data Protection Act, 2012 (Act 843).",
      "Where the Service is used by or on behalf of a HIPAA-covered entity and a Business Associate Agreement (BAA) is in place, we act as a business associate and will comply with the BAA and applicable HIPAA Privacy and Security Rule obligations.",
      "As Nuestman Links Enterprise, we are registered with Ghana’s Data Protection Commission and have internal governance to ensure compliance with Act 843.",
    ],
  },
  {
    id: "use",
    title: "3. Use of the Service",
    paragraphs: [
      "You agree to use the Service only for lawful purposes and in accordance with your subscription and applicable laws and regulations (including workplace safety, commerce, and data protection laws).",
      "You must not attempt to gain unauthorised access to the Service or underlying infrastructure, or reverse engineer or interfere with security or access control features, except where permitted by law.",
    ],
  },
  {
    id: "secure-messaging",
    title: "3a. Secure messaging (customer & supplier portal)",
    paragraphs: [
      "Where enabled by your organisation, the customer and supplier portal may offer secure messaging between customers or suppliers and authorized staff.",
      "Secure messaging is intended for non-urgent communication only. It must not be used for emergencies or situations requiring immediate attention.",
      "Message content may include business and personal data. Messages are stored within the Service using industry-standard safeguards and are retained for a period aligned with your organisation's record retention practices (typically seven years unless your organisation specifies otherwise or law requires a different period).",
      "Only authorized staff roles configured by your organisation may access customer message threads. Email or SMS alerts about new messages do not include message bodies; recipients must sign in to read content.",
      "File attachments in messaging, when offered, are limited to PDF documents and common image formats. Your organisation remains responsible for appropriate use and for directing customers to appropriate emergency services when needed.",
    ],
  },
  {
    id: "customer-resp",
    title: "4. Customer responsibilities",
    paragraphs: [
      "You are responsible for user management (creating, reviewing, and disabling user accounts), for the quality and legality of the data you or your users enter, and for your own compliance with applicable laws and regulations.",
      "The Service is a tool to support your operations; it does not replace your internal policies, training, or compliance programmes.",
    ],
  },
  {
    id: "our-resp",
    title: "5. Our responsibilities",
    paragraphs: [
      "We will provide the Service with reasonable skill and care and make commercially reasonable efforts to maintain availability, subject to planned maintenance and events beyond our reasonable control.",
      "We implement technical and organisational measures to protect data, as described in our Privacy Policy, and where applicable under a BAA we act as a HIPAA business associate.",
      "We do not provide legal, regulatory, or professional operational advice. You remain responsible for how you use the Service in your environment.",
    ],
  },
  {
    id: "ip",
    title: "6. Intellectual property",
    paragraphs: [
      "All intellectual property rights in and to the Service belong to Nuestman Tech Solutions or our licensors. You are granted a limited, non-exclusive, non-transferable right to use the Service during your subscription for your internal business purposes only.",
    ],
  },
  {
    id: "fees",
    title: "7. Fees and payment",
    paragraphs: [
      "Fees and payment terms are as set out in your commercial agreement, proposal, or invoice. Late payments may result in suspension of access until payment is received. Fees are generally non-refundable unless required by law or explicitly stated in your agreement.",
    ],
  },
  {
    id: "confidentiality",
    title: "8. Confidentiality",
    paragraphs: [
      "Each party agrees to treat the other party’s confidential information with at least the same degree of care it uses for its own confidential information and to use such information only for purposes related to providing or using the Service, or as otherwise permitted in a written agreement between us.",
    ],
  },
  {
    id: "warranty",
    title: "9. Warranties and disclaimers",
    paragraphs: [
      "We provide the Service using reasonable skill and care, but to the maximum extent permitted by law, the Service is provided “as is” and “as available” and we do not guarantee that it will be error-free or uninterrupted.",
      "We do not warrant that the Service, by itself, will ensure your compliance with any law or regulation (including GDPR, HIPAA, or Ghana Act 843).",
    ],
  },
  {
    id: "liability",
    title: "10. Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by law, neither party will be liable for indirect, consequential, or special damages (including loss of profits, revenue, or data) arising out of or in connection with the Service.",
      "Our aggregate liability for all claims relating to the Service and these Terms is limited to the amounts you have paid for the Service in the 12 months preceding the event giving rise to the claim, unless a different cap is specified in your commercial agreement or required by law.",
    ],
  },
  {
    id: "termination",
    title: "11. Suspension and termination",
    paragraphs: [
      "We may suspend or restrict access to the Service if you fail to pay fees when due, if your use poses a security risk or may harm other customers, or if you materially breach these Terms and do not remedy that breach after notice.",
      "Upon termination, your right to access the Service ceases and we will handle your data in accordance with our Privacy Policy and any applicable data return or deletion terms.",
    ],
  },
  {
    id: "changes",
    title: "12. Changes to the Service and these Terms",
    paragraphs: [
      "We may update the Service and these Terms from time to time. If we make material changes that significantly affect how the Service works or how these Terms apply, we will provide notice (for example, through the Service or by email). Continued use after changes take effect constitutes acceptance of the updated Terms.",
    ],
  },
  {
    id: "law",
    title: "13. Governing law and disputes",
    paragraphs: [
      "Unless otherwise specified in a signed commercial agreement, these Terms and any disputes arising out of or relating to them or the Service are governed by the laws of Ghana, and the courts of Ghana have jurisdiction, without prejudice to any mandatory rights under other applicable laws.",
    ],
  },
  {
    id: "contact",
    title: "14. Contact",
    paragraphs: [
      `For questions about these Terms or your subscription, contact ${PRIVACY_CONTACT.orgName}, registered as ${PRIVACY_CONTACT.registeredName} with Ghana ORC and DPC, at ${PRIVACY_CONTACT.address}, email ${PRIVACY_CONTACT.email}, phone ${PRIVACY_CONTACT.phone}, or WhatsApp via the link on our Contact page.`,
    ],
  },
];

