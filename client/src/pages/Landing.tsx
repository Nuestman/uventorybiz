import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { 
  Shield, Users, Activity, CheckCircle2, Database, Lock, Zap, 
  TestTube2, Package, ArrowRight, Sparkles, Building2, 
  Droplet, AlertTriangle, ClipboardList, FileCheck,
  Layers, Rocket, TrendingUp, Play, BarChart3, ShoppingCart, Truck
} from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 }
  }
};

export default function Landing() {
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash?.slice(1);
      if (!hash) return;
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const raf = requestAnimationFrame(() => scrollToHash());
    window.addEventListener("hashchange", scrollToHash);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", scrollToHash);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EAF6FF] to-white pt-16 pb-32">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#142F5C] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#F6621E] rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-8">
              <Badge className="bg-[#F6621E]/10 text-[#F6621E] border-[#F6621E]/20 px-6 py-2 text-sm font-bold hover:bg-[#F6621E]/20 transition-colors">
                <Sparkles className="w-4 h-4 mr-2 inline" />
                INVENTORY + POS + OPERATIONS • PRODUCTION-READY
              </Badge>
            </motion.div>

            <motion.h1 
              variants={fadeInUp}
              className="text-6xl lg:text-7xl font-black text-[#142F5C] mb-8 leading-tight"
            >
              Run Your Business
              <span className="block text-[#F6621E]">From One Platform</span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className="text-xl lg:text-2xl text-[#142F5C]/70 mb-12 leading-relaxed font-medium"
            >
              Multi-tenant inventory, point of sale, fleet, and operations management.
              <span className="block mt-2">Built for companies with multiple sites and teams.</span>
            </motion.p>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg"
                  onClick={() => window.location.href = '/auth'}
                  className="bg-[#F6621E] hover:bg-[#F6621E]/90 text-white text-lg px-12 py-7 rounded-xl font-black shadow-2xl group"
                >
                  Start Free 30-Day Trial
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-2 border-[#142F5C] text-[#142F5C] hover:bg-[#142F5C] hover:text-white text-lg px-12 py-7 rounded-xl font-black"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </motion.div>
            </motion.div>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap justify-center gap-8 text-[#142F5C]/60"
            >
              {["✓ No Credit Card", "✓ Setup < 1 Hour", "✓ 24/7 Support"].map((text, i) => (
                <span key={i} className="font-semibold">{text}</span>
              ))}
            </motion.div>

            <motion.p variants={fadeInUp} className="mt-6 text-center text-sm text-[#142F5C]/70">
              <a
                href="/portal"
                className="font-semibold underline underline-offset-4 hover:text-[#F6621E]"
              >
                Customer & supplier portal sign-in
              </a>
              <span className="mx-2 text-[#142F5C]/40">·</span>
              <span className="text-[#142F5C]/60">For customers and suppliers accessing orders, messages, and appointments</span>
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 bg-[#142F5C]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: "38+", label: "Modules" },
              { number: "99.9%", label: "Uptime" },
              { number: "<1hr", label: "Setup" },
              { number: "24/7", label: "Support" }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <div className="text-5xl font-black text-[#F6621E] mb-2">{stat.number}</div>
                <div className="text-white/80 font-semibold">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[#142F5C]/10 text-[#142F5C] border-[#142F5C]/20 px-4 py-2 font-bold">
              COMPREHENSIVE FEATURES
            </Badge>
            <h2 className="text-5xl font-black text-[#142F5C] mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-[#142F5C]/70 max-w-2xl mx-auto">
              Purpose-built for multi-site businesses — inventory, sales, fleet, and day-to-day operations in one place
            </p>
          </div>

          <Tabs defaultValue="inventory" className="w-full">
            <div className="tabs-list-custom mb-12 max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-3 bg-transparent h-auto p-1 gap-1 lg:gap-2">
                <TabsTrigger value="inventory" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
                  <Package className="w-5 h-5 flex-shrink-0" />
                  Inventory & POS
                </TabsTrigger>
                <TabsTrigger value="people" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
                  <Users className="w-5 h-5 flex-shrink-0" />
                  People & Fleet
                </TabsTrigger>
                <TabsTrigger value="operations" className="tab-trigger-custom flex items-center justify-center gap-2 text-xs sm:text-sm">
                  <Building2 className="w-5 h-5 flex-shrink-0" />
                  Operations
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="inventory" className="mt-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: Package,
                    title: "Inventory Management",
                    desc: "Stock levels, expiry alerts, transfers, and purchase orders across locations",
                    color: "#F6621E"
                  },
                  {
                    icon: ShoppingCart,
                    title: "Point of Sale",
                    desc: "Sales transactions, receipts, and stock deduction at the register",
                    color: "#142F5C"
                  },
                  {
                    icon: Truck,
                    title: "Suppliers & POs",
                    desc: "Supplier records, purchase orders, and inbound stock workflows",
                    color: "#F6621E"
                  },
                  {
                    icon: ArrowRight,
                    title: "Stock Transfers",
                    desc: "Move products between stores and warehouses with full audit trail",
                    color: "#142F5C"
                  },
                  {
                    icon: BarChart3,
                    title: "Transaction History",
                    desc: "Sales and inventory movements with searchable history",
                    color: "#F6621E"
                  },
                  {
                    icon: FileCheck,
                    title: "Audit Trail",
                    desc: "Complete compliance logging and original data preservation",
                    color: "#142F5C"
                  }
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className="border-2 border-gray-100 hover:border-[#F6621E] hover:shadow-xl transition-all duration-300 h-full">
                      <CardContent className="p-6">
                        <div 
                          className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                          style={{ backgroundColor: `${feature.color}15` }}
                        >
                          <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                        </div>
                        <h3 className="text-xl font-black text-[#142F5C] mb-2">{feature.title}</h3>
                        <p className="text-[#142F5C]/70 leading-relaxed">{feature.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="people" className="mt-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: Users,
                    title: "Employee Wellbeing",
                    desc: "Follow-ups, feedback, and workforce support programmes",
                    color: "#F6621E"
                  },
                  {
                    icon: Truck,
                    title: "Fleet Management",
                    desc: "Vehicle registry, on-board stock, and pre-start checks",
                    color: "#142F5C"
                  },
                  {
                    icon: AlertTriangle,
                    title: "Incident Reporting",
                    desc: "Real-time capture, site office reporting, and fleet dispatch tracking",
                    color: "#F6621E"
                  },
                  {
                    icon: TestTube2,
                    title: "Compliance Testing",
                    desc: "Drug, alcohol, and hydration programmes with audit-ready records",
                    color: "#142F5C"
                  },
                  {
                    icon: Activity,
                    title: "Customer Portal",
                    desc: "Appointments, messaging, and self-service for customers and suppliers",
                    color: "#F6621E"
                  },
                  {
                    icon: Shield,
                    title: "Role-Based Access",
                    desc: "Staff, operations, and admin roles scoped per company and site",
                    color: "#142F5C"
                  }
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className="border-2 border-gray-100 hover:border-[#F6621E] hover:shadow-xl transition-all duration-300 h-full">
                      <CardContent className="p-6">
                        <div 
                          className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                          style={{ backgroundColor: `${feature.color}15` }}
                        >
                          <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                        </div>
                        <h3 className="text-xl font-black text-[#142F5C] mb-2">{feature.title}</h3>
                        <p className="text-[#142F5C]/70 leading-relaxed">{feature.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="operations" className="mt-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    icon: Building2,
                    title: "Multi-Tenant",
                    desc: "Perfect data isolation, unlimited business sites",
                    color: "#F6621E"
                  },
                  {
                    icon: Layers,
                    title: "Multi-Company",
                    desc: "Parent company plus contractors, hierarchical structure",
                    color: "#142F5C"
                  },
                  {
                    icon: Lock,
                    title: "Enterprise Security",
                    desc: "Row-level security, audit logging, GDPR-ready",
                    color: "#F6621E"
                  },
                  {
                    icon: ClipboardList,
                    title: "Operational Duties",
                    desc: "Daily scheduling, completion tracking, and shift handover",
                    color: "#142F5C"
                  },
                  {
                    icon: BarChart3,
                    title: "Advanced Analytics",
                    desc: "Custom reports, KPIs, and compliance dashboards",
                    color: "#F6621E"
                  },
                  {
                    icon: Rocket,
                    title: "Cloud-Native",
                    desc: "Scales infinitely, 99.9% uptime, auto-backups",
                    color: "#142F5C"
                  }
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className="border-2 border-gray-100 hover:border-[#F6621E] hover:shadow-xl transition-all duration-300 h-full">
                      <CardContent className="p-6">
                        <div 
                          className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                          style={{ backgroundColor: `${feature.color}15` }}
                        >
                          <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                        </div>
                        <h3 className="text-xl font-black text-[#142F5C] mb-2">{feature.title}</h3>
                        <p className="text-[#142F5C]/70 leading-relaxed">{feature.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <section className="py-24 bg-[#EAF6FF]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[#F6621E] text-white border-0 px-4 py-2 font-bold">
              WHY UVENTORYBIZ
            </Badge>
            <h2 className="text-5xl font-black text-[#142F5C] mb-4">
              Unmatched Value for Growing Businesses
            </h2>
            <p className="text-xl text-[#142F5C]/70 max-w-2xl mx-auto">
              Purpose-built features that generic ERP and inventory tools don&apos;t offer out of the box
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                badge: "BUSINESS-READY",
                title: "Built for Real Operations",
                points: [
                  "Multi-location inventory and POS",
                  "Fleet units with on-board stock",
                  "Site incident reporting",
                  "Employee wellbeing and follow-ups",
                  "Customer & supplier portal"
                ]
              },
              {
                badge: "COST SAVINGS",
                title: "Enterprise at a Fraction of the Cost",
                points: [
                  "Commercial ERP suites: $50K–500K/year",
                  "uventorybiz: starting at $5K/year",
                  "Significant cost reduction",
                  "No per-user fees",
                  "Unlimited business sites"
                ]
              },
              {
                badge: "READY NOW",
                title: "Deploy in 1 Hour",
                points: [
                  "No 6-month implementation",
                  "No consultants needed",
                  "No custom development",
                  "Production-ready today",
                  "24/7 support included"
                ]
              }
            ].map((section, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
              >
                <Card className="border-2 border-[#142F5C]/10 hover:border-[#F6621E] hover:shadow-2xl transition-all h-full">
                  <CardContent className="p-8">
                    <Badge className="mb-4 bg-[#F6621E]/10 text-[#F6621E] border-[#F6621E]/20 font-bold">
                      {section.badge}
                    </Badge>
                    <h3 className="text-2xl font-black text-[#142F5C] mb-6">{section.title}</h3>
                    <ul className="space-y-3">
                      {section.points.map((point, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-[#F6621E] mt-0.5 flex-shrink-0" />
                          <span className="text-[#142F5C]/80">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[#142F5C]/10 text-[#142F5C] border-[#142F5C]/20 px-4 py-2 font-bold">
              TRANSPARENT PRICING
            </Badge>
            <h2 className="text-5xl font-black text-[#142F5C] mb-4">
              Fair Pricing, Massive Savings
            </h2>
            <p className="text-xl text-[#142F5C]/70 max-w-3xl mx-auto">
              Get enterprise business-management features at a fraction of the cost. No hidden fees, no surprises.
            </p>
          </div>

          <p className="text-center mt-12 text-[#142F5C]/60 text-lg">
            All plans include unlimited users, unlimited sites, and free updates
          </p>
        </div>
      </section>

      <section id="security" className="py-24 bg-white border-t border-gray-100 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[#142F5C]/10 text-[#142F5C] border-[#142F5C]/20 px-4 py-2 font-bold">
              TECHNICAL EXCELLENCE
            </Badge>
            <h2 className="text-5xl font-black text-[#142F5C] mb-4">
              Production-Ready Architecture
            </h2>
            <p className="text-xl text-[#142F5C]/70 max-w-2xl mx-auto">
              Built with modern technology for reliability and scale
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Multi-Tenant Architecture",
                desc: "Perfect data isolation. Each company site operates independently while sharing infrastructure costs.",
                icon: Layers,
                specs: ["Row-level security", "Tenant-based access", "Shared infrastructure", "Independent backups"]
              },
              {
                title: "Enterprise Security",
                desc: "Bank-grade security with complete audit trails. GDPR-ready from day one.",
                icon: Lock,
                specs: ["Encrypted at rest & transit", "Role-based access", "Complete audit logging", "Session management"]
              },
              {
                title: "Scalable Infrastructure",
                desc: "Cloud-native design that scales from 10 to 10,000 users without performance issues.",
                icon: Rocket,
                specs: ["Auto-scaling", "99.9% uptime SLA", "Global CDN", "Automated backups"]
              },
              {
                title: "Real-Time Updates",
                desc: "Instant notifications and live dashboards. Know what's happening as it happens.",
                icon: Zap,
                specs: ["Live updates", "Push notifications", "Real-time analytics", "Instant alerts"]
              }
            ].map((tech, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="border-2 border-gray-100 hover:border-[#F6621E] hover:shadow-xl transition-all h-full">
                  <CardContent className="p-8">
                    <div className="w-16 h-16 bg-[#142F5C] rounded-2xl flex items-center justify-center mb-6">
                      <tech.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-black text-[#142F5C] mb-3">{tech.title}</h3>
                    <p className="text-[#142F5C]/70 mb-6 leading-relaxed">{tech.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {tech.specs.map((spec, j) => (
                        <Badge key={j} variant="outline" className="border-[#F6621E]/30 text-[#142F5C] font-semibold">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-b from-white to-[#EAF6FF]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[#F6621E] text-white border-0 px-4 py-2 font-bold">
              TRUSTED BY OPERATIONS LEADERS
            </Badge>
            <h2 className="text-5xl font-black text-[#142F5C] mb-4">
              Join the Operations Revolution
            </h2>
            <p className="text-xl text-[#142F5C]/70 max-w-2xl mx-auto">
              Multi-site businesses worldwide are upgrading to uventorybiz
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              {
                quote: "uventorybiz replaced our patchwork of spreadsheets and legacy tools. Inventory, POS, and fleet stock in one system changed how we run our sites.",
                author: "Operations Director",
                company: "Regional Retail Group",
                stat: "90% cost reduction"
              },
              {
                quote: "Setup took 45 minutes. We were operational the same day. Stock transfers and purchase orders alone justified the investment.",
                author: "Store Manager",
                company: "Multi-Site Retail",
                stat: "<1 hour deployment"
              },
              {
                quote: "Finally, a platform that understands multi-location operations. Duty scheduling and incident reporting are exactly what we needed.",
                author: "Site Lead",
                company: "Field Services Company",
                stat: "38+ modules included"
              },
              {
                quote: "The audit trail and compliance features passed our regulatory review on first try. Worth every penny.",
                author: "Compliance Officer",
                company: "Contractor Network",
                stat: "100% compliant"
              }
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="border-2 border-[#142F5C]/10 hover:border-[#F6621E] hover:shadow-xl transition-all h-full">
                  <CardContent className="p-8">
                    <div className="mb-6">
                      <div className="text-6xl text-[#F6621E] font-serif">"</div>
                      <p className="text-lg text-[#142F5C] leading-relaxed italic">
                        {testimonial.quote}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                      <div>
                        <p className="font-bold text-[#142F5C]">{testimonial.author}</p>
                        <p className="text-sm text-[#142F5C]/60">{testimonial.company}</p>
                      </div>
                      <Badge className="bg-[#F6621E] text-white border-0 font-bold">
                        {testimonial.stat}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-[#142F5C] via-[#1a3d75] to-[#142F5C] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#F6621E] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#EAF6FF] rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <Badge className="mb-6 bg-[#F6621E] text-white border-0 px-6 py-2 font-bold text-sm">
            READY TO DEPLOY
          </Badge>
          <h2 className="text-5xl lg:text-6xl font-black text-white mb-8">
            Transform Your Business
            <span className="block text-[#F6621E]">Operations Today</span>
          </h2>
          <p className="text-xl text-white/80 mb-12 leading-relaxed">
            Join forward-thinking companies consolidating inventory, POS, and operations on one platform.
            <span className="block mt-2 font-semibold">Setup in less than 1 hour. Start your free trial now.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg"
                onClick={() => window.location.href = '/auth'}
                className="bg-[#F6621E] hover:bg-[#F6621E]/90 text-white text-xl px-12 py-7 rounded-xl font-black shadow-2xl"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-6 w-6" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => window.location.href = 'mailto:contact@uventorybiz.com?subject=Schedule%20Demo'}
                className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-[#142F5C] text-xl px-12 py-7 rounded-xl font-black transition-all"
              >
                Schedule Demo
              </Button>
            </motion.div>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-white/70">
            {["Enterprise Security", "24/7 Support", "No Credit Card", "Production-Ready"].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#F6621E]" />
                <span className="font-semibold">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
