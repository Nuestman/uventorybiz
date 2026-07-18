import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Home,
  Users,
  Stethoscope,
  FileText,
  AlertTriangle,
  Calendar,
  Clock,
  History,
  ClipboardList,
  Package,
  Truck,
  ArrowRightLeft,
  ShoppingCart,
  Building2,
  Wrench,
  TestTube,
  FlaskConical,
  BarChart3,
  Shield,
  Cog,
  Settings,
  BookOpen,
  UsersRound,
  PhoneCall,
  Pill,
  MessageSquare,
  Lock,
  Layers,
  Zap,
  Rocket,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

/** Placeholder "screenshot" of an app screen - no external image */
function ScreenshotPlaceholder({
  variant = "dashboard",
  className = "",
  delay = 0,
}: {
  variant?: "dashboard" | "patients" | "testing" | "inventory" | "operations" | "dark";
  className?: string;
  delay?: number;
}) {
  const variants = {
    dashboard: "from-[#142F5C]/90 via-[#1a3d75] to-[#142F5C]/95",
    patients: "from-[#EAF6FF] via-white to-[#F6621E]/5",
    testing: "from-[#0f172a] via-[#1e293b] to-[#0f172a]",
    inventory: "from-[#F6621E]/10 via-[#EAF6FF] to-[#142F5C]/10",
    operations: "from-[#142F5C]/10 via-[#EAF6FF] to-[#F6621E]/10",
    dark: "from-[#142F5C] via-[#1a3d75] to-[#0f172a]",
  };
  const bars = variant === "dark" || variant === "testing" ? "bg-white/10" : "bg-[#142F5C]/10";

  return (
    <motion.div
      className={`rounded-2xl overflow-hidden border border-[#142F5C]/10 shadow-2xl shadow-[#142F5C]/15 ${className}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/90 border-b border-[#142F5C]/10">
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-[#142F5C]/20" />
          ))}
        </div>
        <div className="flex-1 max-w-[60%] h-6 rounded-md bg-[#142F5C]/5 mx-auto" />
      </div>
      {/* App content mock */}
      <div className={`aspect-[4/3] bg-gradient-to-br ${variants[variant]} p-5 flex flex-col gap-3`}>
        <div className={`h-2 rounded-full ${bars} w-3/4`} />
        <div className="flex gap-3 flex-1">
          <div className={`w-1/4 rounded-lg ${bars} opacity-80`} />
          <div className="flex-1 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-3 rounded ${bars} opacity-60`} style={{ width: `${100 - i * 15}%` }} />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-8 flex-1 rounded-lg ${bars}`} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Features() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero - editorial style */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden bg-[#142F5C]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-80" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 py-20">
          <div className="max-w-xl">
            <Badge className="mb-6 bg-[#F6621E]/20 text-[#F6621E] border-[#F6621E]/30 font-bold">
              All modules
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.05] tracking-tight">
              One system.
              <br />
              <span className="text-[#F6621E]">Every angle.</span>
            </h1>
            <p className="text-lg md:text-xl text-white/75 leading-relaxed">
              Healthcare, testing, inventory, operations, and compliance—purpose-built for multi-site businesses, with no generic-ERP gaps.
            </p>
          </div>
          <motion.div
            className="hidden lg:block flex-shrink-0 w-full max-w-md"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <ScreenshotPlaceholder variant="dashboard" className="rotate-[-2deg]" />
          </motion.div>
        </div>
      </section>

      {/* Healthcare - light bg, image right */}
      <section className="relative py-24 md:py-32 bg-[#EAF6FF]/50 overflow-hidden">
        <div className="absolute top-0 right-0 w-[40%] h-full bg-gradient-to-l from-[#F6621E]/5 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              className="order-2 lg:order-1"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 bg-[#142F5C]/10 text-[#142F5C] border-[#142F5C]/20 font-bold">
                Core operations
              </Badge>
              <h2 className="text-3xl md:text-4xl font-black text-[#142F5C] mb-6">
                Inventory &amp; sales
              </h2>
              <p className="text-[#142F5C]/75 text-lg mb-8">
                Stock management, point of sale, suppliers, and incident tracking—all in one place with full audit trail.
              </p>
              <ul className="space-y-4">
                {[
                  { icon: Users, title: "Employee records", desc: "Multi-company tracking, roles, and emergency contacts" },
                  { icon: Package, title: "Inventory & POS", desc: "Stock levels, sales, transfers, and purchase orders" },
                  { icon: FileText, title: "Transaction history", desc: "Sales and stock movements with searchable records" },
                  { icon: AlertTriangle, title: "Incident management", desc: "Site office reporting, fleet dispatch, compliance" },
                ].map(({ icon: Icon, title, desc }) => (
                  <li key={title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#F6621E]/15 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#F6621E]" />
                    </div>
                    <div>
                      <span className="font-bold text-[#142F5C]">{title}</span>
                      <span className="text-[#142F5C]/70"> — {desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div className="order-1 lg:order-2" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
              <ScreenshotPlaceholder variant="patients" delay={0.1} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testing - dark strip, image left */}
      <section className="relative py-24 md:py-32 bg-[#0f172a] text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'30\' height=\'30\' viewBox=\'0 0 30 30\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M15 0L30 15L15 30L0 15Z\' fill=\'%23F6621E\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'/%3E%3C/svg%3E')]" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
              <ScreenshotPlaceholder variant="testing" delay={0} className="border-white/10" />
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
              <Badge className="mb-4 bg-[#F6621E]/20 text-[#F6621E] border-[#F6621E]/30 font-bold">
                Compliance
              </Badge>
              <h2 className="text-3xl md:text-4xl font-black text-white mb-6">
                Drug, alcohol & hydration testing
              </h2>
              <p className="text-white/75 text-lg mb-8">
                End-to-end programmes: perform tests, schedule random pools, chain of custody, and compliance reporting.
              </p>
              <ul className="space-y-3 text-white/85">
                {["Testing overview & dashboard", "New test (D&A&H) with MRO workflow", "Test scheduling & random pools", "Reports & analytics"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#F6621E] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Employee wellbeing + Operations - bento-style on warm gray */}
      <section className="py-24 md:py-32 bg-[#f8f9fa]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[#142F5C]/10 text-[#142F5C] border-[#142F5C]/20 font-bold">
              People & operations
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black text-[#142F5C] mb-4">
              Wellbeing and scheduling
            </h2>
            <p className="text-[#142F5C]/70 max-w-2xl mx-auto text-lg">
              Employee follow-ups, medication declarations, feedback, appointments, duties, and reports.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              className="rounded-2xl bg-white p-8 shadow-lg shadow-[#142F5C]/08 border border-[#142F5C]/06"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#F6621E]/15 flex items-center justify-center">
                  <UsersRound className="w-6 h-6 text-[#F6621E]" />
                </div>
                <h3 className="text-xl font-bold text-[#142F5C]">Employee wellbeing</h3>
              </div>
              <ul className="space-y-2 text-[#142F5C]/75 text-sm">
                {[
                  { icon: UsersRound, label: "Wellbeing hub" },
                  { icon: PhoneCall, label: "Employee follow-ups" },
                  { icon: Pill, label: "Medication declarations" },
                  { icon: MessageSquare, label: "Feedback & surveys" },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#142F5C]/50" />
                    {label}
                  </li>
                ))}
              </ul>
            </motion.div>
            <motion.div
              className="rounded-2xl bg-white p-8 shadow-lg shadow-[#142F5C]/08 border border-[#142F5C]/06"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#142F5C]/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-[#142F5C]" />
                </div>
                <h3 className="text-xl font-bold text-[#142F5C]">Operations</h3>
              </div>
              <ul className="space-y-2 text-[#142F5C]/75 text-sm">
                {[
                  { icon: Calendar, label: "Appointments" },
                  { icon: Clock, label: "Operational duties" },
                  { icon: History, label: "Assignment history" },
                  { icon: ClipboardList, label: "Reports" },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#142F5C]/50" />
                    {label}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Inventory - alternating again, coral tint bg */}
      <section className="relative py-24 md:py-32 bg-gradient-to-br from-[#F6621E]/08 via-white to-[#EAF6FF]/80 overflow-hidden">
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-[#142F5C]/5 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5 }}>
              <ScreenshotPlaceholder variant="inventory" delay={0} />
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
              <Badge className="mb-4 bg-[#F6621E]/15 text-[#c44d0a] border-[#F6621E]/30 font-bold">
                Supply chain
              </Badge>
              <h2 className="text-3xl md:text-4xl font-black text-[#142F5C] mb-6">
                Inventory management
              </h2>
              <p className="text-[#142F5C]/75 text-lg mb-8">
                Product inventory, stock transfers, transactions, purchase orders, suppliers, and equipment tracking—with expiry alerts and audit trail.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Inventory", "Stock transfers", "Transactions", "Purchase orders", "Suppliers", "Equipment tracking"].map((tag) => (
                  <span key={tag} className="rounded-full bg-[#142F5C]/08 px-4 py-2 text-sm font-medium text-[#142F5C]">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Platform & admin - full-width navy band with grid */}
      <section className="py-24 md:py-32 bg-[#142F5C] text-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-white/15 text-white border-white/20 font-bold">
              Platform
            </Badge>
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Administration & infrastructure
            </h2>
            <p className="text-white/75 max-w-2xl mx-auto text-lg">
              Settings, admin panel, super admin, audit trail, multi-tenant architecture, security, and real-time updates.
            </p>
          </div>
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {[
              { icon: Cog, label: "Settings" },
              { icon: Shield, label: "Admin panel" },
              { icon: Settings, label: "Super admin" },
              { icon: History, label: "Audit trail" },
              { icon: Layers, label: "Multi-tenant" },
              { icon: Lock, label: "Security" },
              { icon: Zap, label: "Real-time" },
              { icon: Rocket, label: "Cloud-native" },
            ].map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="rounded-xl bg-white/08 hover:bg-white/12 border border-white/10 p-5 text-center transition-colors"
              >
                <Icon className="w-8 h-8 mx-auto mb-2 text-[#F6621E]" />
                <span className="text-sm font-semibold">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Resources - minimal strip */}
      <section className="py-16 bg-[#EAF6FF] border-y border-[#142F5C]/08">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#142F5C] flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#142F5C]">Documentation</h3>
              <p className="text-[#142F5C]/70 text-sm">Guides and technical reference for admins and power users.</p>
            </div>
          </div>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 rounded-xl bg-[#F6621E] hover:bg-[#F6621E]/90 text-white font-bold px-6 py-3 transition-colors"
          >
            Get started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA - gradient */}
      <section className="relative py-24 md:py-28 bg-gradient-to-br from-[#142F5C] via-[#1a3d75] to-[#142F5C] overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23F6621E\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {["38+ modules", "Multi-tenant", "Multi-site ready", "Production-ready"].map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                <CheckCircle2 className="w-4 h-4 text-[#F6621E]" />
                {tag}
              </span>
            ))}
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-white/80 text-lg mb-8">
            Start your free trial or schedule a demo tailored to your business.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center rounded-xl bg-[#F6621E] hover:bg-[#F6621E]/90 text-white font-bold px-8 py-3.5 shadow-lg transition-colors"
            >
              Start free trial
            </Link>
            <Link
              href="/contacts"
              className="inline-flex items-center justify-center rounded-xl border-2 border-white/60 hover:border-white hover:bg-white/10 text-white font-bold px-8 py-3.5 transition-colors"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
