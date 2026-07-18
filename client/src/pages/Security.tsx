import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Shield, Database, FileCheck } from "lucide-react";

export default function Security() {
  const items = [
    {
      icon: Lock,
      title: "Encryption",
      desc: "Data is encrypted in transit (TLS) and at rest. Access is controlled by role-based permissions and tenant isolation.",
    },
    {
      icon: Shield,
      title: "Access control",
      desc: "Row-level security and tenant boundaries ensure that each company only sees its own data. Audit logging tracks who did what and when.",
    },
    {
      icon: Database,
      title: "Infrastructure",
      desc: "uventorybiz runs on secure, monitored infrastructure with regular backups and high availability targets.",
    },
    {
      icon: FileCheck,
      title: "Compliance",
      desc: "We design for auditability and compliance with healthcare and data protection requirements. Work with your legal and compliance teams to align with local regulations.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#EAF6FF] to-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <Badge className="mb-4 bg-[#F6621E]/10 text-[#F6621E] border-[#F6621E]/20 font-bold">
            TRUST & COMPLIANCE
          </Badge>
          <h1 className="text-4xl md:text-5xl font-black text-[#142F5C] mb-6">
            Security
          </h1>
          <p className="text-[#142F5C]/75 text-lg mb-12 max-w-2xl">
            We take the security of your healthcare and operational data
            seriously. Below is an overview of how we protect and manage data
            in uventorybiz.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {items.map(({ icon: Icon, title, desc }) => (
              <Card
                key={title}
                className="border-2 border-[#142F5C]/10 hover:border-[#F6621E]/30 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#142F5C] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-[#142F5C]">{title}</h2>
                  </div>
                  <p className="text-[#142F5C]/75 text-sm leading-relaxed">
                    {desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-10 text-[#142F5C]/70 text-sm">
            For detailed security or compliance questions, contact{" "}
            <a
              href="mailto:support@uventorybiz.com?subject=Security"
              className="text-[#F6621E] hover:underline"
            >
              support@uventorybiz.com
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
