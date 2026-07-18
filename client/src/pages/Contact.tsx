import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { FormEvent } from "react";
import { PRIVACY_CONTACT } from "@/content/privacyPolicy";

export default function Contact() {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    window.location.href = `mailto:${PRIVACY_CONTACT.email}?subject=uventorybiz%20enquiry`;
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="py-16 md:py-20 bg-gradient-to-b from-[#EAF6FF] to-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <Badge className="bg-[#F6621E]/10 text-[#F6621E] border-[#F6621E]/20 font-bold">
              CONTACT
            </Badge>
            <h1 className="mt-4 text-4xl md:text-5xl font-black text-[#142F5C]">
              Let&apos;s talk about your mine.
            </h1>
            <p className="mt-4 text-lg text-[#142F5C]/75 max-w-3xl">
              Whether you are replacing an existing HMS, starting from paper, or
              exploring options, we&apos;d be happy to walk through what uventorybiz
              HMS would look like for your operation.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            <Card className="border-2 border-[#142F5C]/10">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-black text-[#142F5C]">
                  Quick contact
                </h2>
                <p className="text-sm text-[#142F5C]/75">
                  Use the details below for fast answers or to schedule a demo.
                </p>
                <div className="space-y-3 text-sm text-[#142F5C]/80">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 shrink-0 text-[#F6621E]" />
                    <a
                      href={`mailto:${PRIVACY_CONTACT.email}`}
                      className="hover:text-[#F6621E]"
                    >
                      {PRIVACY_CONTACT.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 shrink-0 text-[#F6621E]" />
                    <a
                      href={`tel:${PRIVACY_CONTACT.phoneE164}`}
                      className="hover:text-[#F6621E]"
                    >
                      {PRIVACY_CONTACT.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <FaWhatsapp className="w-4 h-4 shrink-0 text-[#25D366]" />
                    <a
                      href={PRIVACY_CONTACT.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[#F6621E]"
                    >
                      WhatsApp
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 shrink-0 text-[#F6621E]" />
                    <span>{PRIVACY_CONTACT.address}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#142F5C]/10">
              <CardContent className="p-6">
                <h2 className="text-xl font-black text-[#142F5C] mb-4">
                  Send us a message
                </h2>
                <p className="text-sm text-[#142F5C]/75 mb-4">
                  Share a few details about your operation and we&apos;ll follow
                  up with next steps.
                </p>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[#142F5C]">
                      Name
                    </label>
                    <Input placeholder="Your name" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[#142F5C]">
                      Company / Site
                    </label>
                    <Input placeholder="Company or business site" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[#142F5C]">
                      Email
                    </label>
                    <Input
                      placeholder="you@example.com"
                      type="email"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-[#142F5C]">
                      What would you like to discuss?
                    </label>
                    <Textarea
                      placeholder="Current challenges, timelines, number of sites, etc."
                      rows={4}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-[#F6621E] hover:bg-[#F6621E]/90 text-white font-black"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Open email to contact us
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

