import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Users,
  Stethoscope,
  Building2,
  Shield,
  Rocket,
  Activity,
  AlertTriangle,
  FileText,
  Layers,
  Lock,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Link } from "wouter";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

function AboutScreenshot({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={`rounded-2xl overflow-hidden border border-[#142F5C]/10 shadow-2xl shadow-[#142F5C]/15 bg-white/90 ${className}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay }}
    >
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0f172a]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
        </div>
        <div className="flex-1 ml-3 h-6 rounded-md bg-white/5" />
      </div>
      <div className="bg-gradient-to-br from-[#142F5C] via-[#1a3d75] to-[#0f172a] px-5 py-4 text-white/90 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">uventorybiz</p>
            <p className="text-sm font-semibold text-white/80">Active shift · Moinsi Valley</p>
          </div>
          <div className="flex gap-1.5">
            <span className="px-2 py-1 rounded-full bg-white/10 text-[10px] font-semibold">
              Inventory
            </span>
            <span className="px-2 py-1 rounded-full bg-white/10 text-[10px] font-semibold">
              POS
            </span>
          </div>
        </div>
        <div className="grid grid-cols-[1.2fr,1fr] gap-4">
          <div className="space-y-2">
            <div className="h-8 rounded-lg bg-white/6 flex items-center px-3 gap-2">
              <Users className="w-4 h-4 text-[#F6621E]" />
              <span className="text-xs font-semibold tracking-wide">
                Stores · Multi-company, multi-site
              </span>
            </div>
            <div className="h-7 rounded-lg bg-white/4 flex items-center px-3 gap-2 text-[11px]">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-300" />
              <span>12 orders in progress · 4 transfers pending</span>
            </div>
            <div className="h-7 rounded-lg bg-white/4 flex items-center px-3 gap-2 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>Incident at Bay 3 · response documented</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 text-[10px]">
              <div className="rounded-lg bg-white/6 px-2 py-2 text-center">
                <p className="text-[11px] font-bold text-white">99.9%</p>
                <p className="text-white/60">Uptime</p>
              </div>
              <div className="rounded-lg bg-white/6 px-2 py-2 text-center">
                <p className="text-[11px] font-bold text-white">38</p>
                <p className="text-white/60">Modules</p>
              </div>
              <div className="rounded-lg bg-white/6 px-2 py-2 text-center">
                <p className="text-[11px] font-bold text-white">4</p>
                <p className="text-white/60">Sites</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-24 rounded-xl bg-white/5 p-3 space-y-1.5 text-[10px]">
              <p className="text-white/70 font-semibold flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Today&apos;s operations picture
              </p>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-2.5 rounded-full bg-white/8 overflow-hidden relative before:absolute before:inset-0 before:w-1/2 before:bg-gradient-to-r before:from-[#F6621E]/40 before:to-transparent"
                />
              ))}
            </div>
            <div className="h-20 rounded-xl bg-white/5 p-3 space-y-1.5 text-[10px]">
              <p className="text-white/70 font-semibold flex items-center gap-1">
                <Activity className="w-3.5 h-3.5" /> Sales & stock
              </p>
              <div className="flex gap-2 pt-1">
                <span className="flex-1 rounded-full bg-emerald-400/30 text-center py-1 text-[10px]">
                  8 sales complete
                </span>
                <span className="flex-1 rounded-full bg-amber-400/25 text-center py-1 text-[10px]">
                  3 POs open
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#142F5C] text-white py-20 md:py-24">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'0.04\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-90" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 flex flex-col lg:flex-row gap-12 items-center">
          <motion.div
            className="flex-1"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
            }}
          >
            <Badge className="mb-4 bg-[#F6621E]/25 text-[#F6621E] border-[#F6621E]/40 font-bold">
              ABOUT UVENTORYBIZ
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.05] mb-5 tracking-tight">
              Business management built for{" "}
              <span className="text-[#F6621E]">real operations</span>.
            </h1>
            <p className="text-white/80 text-lg md:text-xl leading-relaxed mb-6 max-w-xl">
              uventorybiz blends inventory and point-of-sale best practices with
              on-the-ground operational constraints—multiple sites, rotating
              crews, and complex contractor ecosystems.
            </p>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-white/70">
              <span className="px-3 py-2 rounded-full bg-white/10">
                Multi-tenant
              </span>
              <span className="px-3 py-2 rounded-full bg-white/10">
                Multi-site
              </span>
              <span className="px-3 py-2 rounded-full bg-white/10">
                Production-ready
              </span>
            </div>
          </motion.div>
          <div className="flex-1 max-w-md w-full hidden md:block">
            <AboutScreenshot />
          </div>
        </div>
      </section>

      {/* Story + principles */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-[#EAF6FF] to-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[1.4fr,1.2fr] gap-14 items-start">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <h2 className="text-2xl md:text-3xl font-black text-[#142F5C] mb-4">
              Born inside real business sites.
            </h2>
            <p className="text-[#142F5C]/75 text-base md:text-lg leading-relaxed mb-6">
              uventorybiz was co-designed with store managers, operations leads,
              and site teams running active multi-location businesses. Every
              workflow—from inventory and point of sale to duty assignments and
              incident reporting—was iterated with real-world feedback.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 text-sm text-[#142F5C]/80">
              <div className="space-y-2">
                <p className="font-semibold flex items-center gap-2 text-[#142F5C]">
                  <Users className="w-4 h-4 text-[#F6621E]" />
                  Frontline teams first
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Simplified data capture in high-pressure situations</li>
                  <li>Follow-up tracking tuned for rotating crews</li>
                  <li>Stock and compliance workflows wired into daily practice</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-semibold flex items-center gap-2 text-[#142F5C]">
                  <Building2 className="w-4 h-4 text-[#F6621E]" />
                  Built for multi-site companies
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Multi-site, multi-company, multi-tenant from day one</li>
                  <li>Mother company + contractors with clean separation</li>
                  <li>Row-level security and complete audit trail</li>
                </ul>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={fadeUp}
            transition={{ delay: 0.1 }}
            className="space-y-4 rounded-2xl bg-white shadow-xl shadow-[#142F5C]/10 border border-[#142F5C]/10 p-6"
          >
            <p className="text-xs font-semibold text-[#F6621E] uppercase tracking-[0.2em]">
              Design principles
            </p>
            <div className="space-y-3 text-sm text-[#142F5C]/80">
              <p className="flex gap-2">
                <span className="mt-1">
                  <CheckCircle2 className="w-4 h-4 text-[#F6621E]" />
                </span>
                <span>
                  <strong className="text-[#142F5C]">Operations-grade</strong>{" "}
                  experiences that feel natural for frontline staff, not just
                  software teams.
                </span>
              </p>
              <p className="flex gap-2">
                <span className="mt-1">
                  <CheckCircle2 className="w-4 h-4 text-[#F6621E]" />
                </span>
                <span>
                  <strong className="text-[#142F5C]">Field-aware</strong>{" "}
                  constraints: offline windows, patchy connectivity, and
                  shift-based work.
                </span>
              </p>
              <p className="flex gap-2">
                <span className="mt-1">
                  <CheckCircle2 className="w-4 h-4 text-[#F6621E]" />
                </span>
                <span>
                  <strong className="text-[#142F5C]">Compliance by design</strong>{" "}
                  with auditability, separation of duties, and reporting baked
                  in.
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Compliance & platform band */}
      <section className="py-20 bg-[#0f172a] text-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid md:grid-cols-3 gap-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#F6621E]">
                <Stethoscope className="w-4 h-4" />
                Operations focus
              </p>
              <p className="text-sm text-white/80 leading-relaxed">
                Support for inventory, sales, duties, follow-ups, and full
                incident documentation aligned with workplace regulations.
              </p>
            </div>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: 0.05 }}
          >
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#F6621E]">
                <Shield className="w-4 h-4" />
                Compliance & security
              </p>
              <p className="text-sm text-white/80 leading-relaxed">
                Full audit trail, role-based access, and strong privacy
                guarantees to meet internal, Ghanaian, and international
                compliance needs.
              </p>
            </div>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: 0.1 }}
          >
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#F6621E]">
                <Rocket className="w-4 h-4" />
                Production-ready platform
              </p>
              <p className="text-sm text-white/80 leading-relaxed">
                Cloud-native architecture with 99.9% uptime targets and focus
                on fast deployments instead of multi-month projects.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Architecture snapshot */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 grid lg:grid-cols-[1.2fr,1.4fr] gap-14 items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <Badge className="mb-3 bg-[#142F5C]/10 text-[#142F5C] border-[#142F5C]/20 font-bold">
              Architecture snapshot
            </Badge>
            <h2 className="text-2xl md:text-3xl font-black text-[#142F5C] mb-4">
              Multi-tenant, multi-company, multi-layer security.
            </h2>
            <p className="text-[#142F5C]/75 text-sm md:text-base leading-relaxed mb-6">
              We deliberately separate tenants, companies, and roles so that
              each business gets perfect data isolation without losing
              cross-company visibility where it matters.
            </p>
            <ul className="space-y-3 text-sm text-[#142F5C]/80">
              <li className="flex gap-2">
                <Layers className="w-4 h-4 text-[#F6621E] mt-0.5" />
                <span>
                  <strong>Tenants per site or operation</strong> – each site is
                  its own tenant with clean boundaries.
                </span>
              </li>
              <li className="flex gap-2">
                <Building2 className="w-4 h-4 text-[#F6621E] mt-0.5" />
                <span>
                  <strong>Company-level separation</strong> – mother company and
                  contractors in one system, with tight access rules.
                </span>
              </li>
              <li className="flex gap-2">
                <Lock className="w-4 h-4 text-[#F6621E] mt-0.5" />
                <span>
                  <strong>Row-level security & audit trail</strong> – every
                  change is traceable, every access explainable.
                </span>
              </li>
              <li className="flex gap-2">
                <Zap className="w-4 h-4 text-[#F6621E] mt-0.5" />
                <span>
                  <strong>Real-time insights</strong> – operations, sales, and
                  wellbeing data feed a unified picture of the business.
                </span>
              </li>
            </ul>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-[#142F5C]/10 bg-[#EAF6FF]/50 p-6 md:p-8"
          >
            <div className="grid md:grid-cols-3 gap-4 text-[11px] md:text-xs text-[#142F5C]/80">
              <div className="rounded-xl bg-white shadow-sm p-4 space-y-2">
                <p className="font-semibold text-[#142F5C] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#F6621E]" />
                  Tenants
                </p>
                <p>Site A, Site B, Site C – each with its own rules.</p>
              </div>
              <div className="rounded-xl bg-white shadow-sm p-4 space-y-2">
                <p className="font-semibold text-[#142F5C] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#F6621E]" />
                  Companies
                </p>
                <p>Parent company + multiple contractors in one view.</p>
              </div>
              <div className="rounded-xl bg-white shadow-sm p-4 space-y-2">
                <p className="font-semibold text-[#142F5C] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#F6621E]" />
                  Roles
                </p>
                <p>Staff, operations, admin, super admin – clear separation.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mission CTA */}
      <section className="py-20 bg-[#142F5C] text-white">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-black">
            Built to make business operations simpler, faster, and more transparent.
          </h2>
          <p className="text-white/80 text-lg leading-relaxed">
            We believe every business deserves enterprise-grade management tools
            without enterprise-grade friction. uventorybiz is our answer to that belief—
            co-designed with the people who run real stores and real sites.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center rounded-xl bg-[#F6621E] hover:bg-[#F6621E]/90 text-white font-black px-8 py-3.5 shadow-lg transition-colors"
            >
              Talk to us about your site
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center justify-center rounded-xl border-2 border-white/70 hover:border-white hover:bg-white/10 text-white font-semibold px-8 py-3.5 transition-colors text-sm"
            >
              Explore all modules
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}


