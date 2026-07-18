import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { TERMS_SECTIONS } from "@/content/terms";
import { PRIVACY_CONTACT } from "@/content/privacyPolicy";

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#EAF6FF] to-white">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <Badge className="mb-4 bg-[#F6621E]/10 text-[#F6621E] border-[#F6621E]/20 font-bold">
            LEGAL
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black text-[#142F5C] mb-2">
            Terms of Service
          </h1>
          <p className="text-[#142F5C]/75 text-lg mb-6">
            {PRIVACY_CONTACT.orgName}. Last updated: March 2025.
          </p>
          <p className="text-[#142F5C]/70 text-sm mb-10">
            These Terms govern your access to and use of uventorybiz and should
            be read together with our{" "}
            <Link href="/privacy" className="text-[#F6621E] hover:underline">
              Privacy Policy
            </Link>
            , the documents on our{" "}
            <Link href="/legal" className="text-[#F6621E] hover:underline">
              Agreements
            </Link>{" "}
            page (commercial, data processing, subprocessors), and any executed order form or BAA with your
            organisation.
          </p>

          <div className="prose prose-[#142F5C] max-w-none space-y-8 text-[#142F5C]/85">
            {TERMS_SECTIONS.map((section) => (
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
              For any questions about these Terms or your subscription, contact{" "}
              <a
                href={`mailto:${PRIVACY_CONTACT.email}?subject=Terms%20of%20Service%20enquiry`}
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

