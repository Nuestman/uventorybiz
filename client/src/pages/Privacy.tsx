import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  PRIVACY_CONTACT,
  PRIVACY_SECTIONS,
} from "@/content/privacyPolicy";
import { Mail, Phone, MapPin } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-white">
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#EAF6FF] to-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <Badge className="mb-4 bg-[#F6621E]/10 text-[#F6621E] border-[#F6621E]/20 font-bold">
            LEGAL
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black text-[#142F5C] mb-2">
            Privacy Policy
          </h1>
          <p className="text-[#142F5C]/75 text-lg mb-6">
            {PRIVACY_CONTACT.orgName}. Last updated: March 2025.
          </p>
          <p className="text-[#142F5C]/70 text-sm mb-10">
            This policy describes how we collect, use, and protect personal data
            in connection with uventorybiz. It is designed to comply with the EU
            GDPR, US HIPAA (where applicable), and Ghana’s Data Protection Act,
            2012 (Act 843). For commercial agreements, data processing terms, and
            subprocessors, see the{" "}
            <Link href="/legal" className="text-[#F6621E] hover:underline">
              Agreements
            </Link>{" "}
            page.
          </p>

          {/* Contact block */}
          <div className="rounded-xl border-2 border-[#142F5C]/10 bg-white/80 p-6 mb-12">
            <h2 className="text-lg font-bold text-[#142F5C] mb-3">
              Data controller & contact
            </h2>
            <p className="font-semibold text-[#142F5C]">
              {PRIVACY_CONTACT.orgName}
            </p>
            <p className="text-[#142F5C]/70 text-xs mt-1">
              Registered with Ghana ORC and DPC as {PRIVACY_CONTACT.registeredName}.
            </p>
            <p className="text-[#142F5C]/80 text-sm mt-2 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[#F6621E]" />
              {PRIVACY_CONTACT.address}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <a
                href={`mailto:${PRIVACY_CONTACT.email}?subject=Privacy%20enquiry`}
                className="text-[#F6621E] hover:underline inline-flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {PRIVACY_CONTACT.email}
              </a>
              <a
                href={`tel:${PRIVACY_CONTACT.phoneE164}`}
                className="text-[#F6621E] hover:underline inline-flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                {PRIVACY_CONTACT.phone}
              </a>
              <a
                href={PRIVACY_CONTACT.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F6621E] hover:underline inline-flex items-center gap-1.5"
              >
                <FaWhatsapp className="w-3.5 h-3.5 shrink-0 text-[#25D366]" />
                WhatsApp
              </a>
            </div>
          </div>

          <div className="prose prose-[#142F5C] max-w-none space-y-8 text-[#142F5C]/85">
            {PRIVACY_SECTIONS.map((section) => (
              <section key={section.id} id={section.id}>
                <h2 className="text-xl font-bold text-[#142F5C] mb-3">
                  {section.title}
                </h2>
                <div className="space-y-3">
                  {section.paragraphs.map((para, i) => (
                    <p key={i} className="leading-relaxed text-sm md:text-base">
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-[#142F5C]/10">
            <p className="text-[#142F5C]/70 text-sm">
              For a copy of this policy or any privacy enquiry, contact us at{" "}
              <a
                href={`mailto:${PRIVACY_CONTACT.email}?subject=Privacy%20policy%20copy`}
                className="text-[#F6621E] hover:underline"
              >
                {PRIVACY_CONTACT.email}
              </a>{" "}
              or {PRIVACY_CONTACT.phone}.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
