/**
 * Version 2 — Start With Why narrative (`/super-admin/pitch-why`).
 * Golden Circle: WHY → HOW → WHAT. WHAT mirrors `/features` section order.
 * @see docs/MINEAID_PITCH_DECK_V2_START_WITH_WHY.md
 */

import type { PitchSlide } from "./pitchDeckTypes";

export const PITCH_SLIDES_WHY: PitchSlide[] = [
  {
    id: "v2-title",
    kind: "hero",
    label: "Intro",
    title: "MineAid HMS",
    subtitle:
      "Start with why — then how we build — then what the product is. A generalized story for any mining health leader.",
    footnote: "Version 2 · Start With Why · ← → Space · click mid-slide edges · fullscreen",
  },
  {
    id: "v2-golden",
    kind: "statement",
    label: "Golden Circle",
    title: "People don't buy what you do—they buy why you do it.",
    lines: [
      "Most pitches run outside-in: what we sell, how we're different, maybe why it matters. The inspiring ones run inside-out: Why (belief), How (discipline), What (proof).",
      "When the why lands, the what feels obvious—you're not \"learning features,\" you're confirming a decision you already understand.",
    ],
  },
  {
    id: "v2-belief",
    kind: "statement",
    label: "Why · Belief",
    title: "Every mining workforce deserves healthcare information as serious as the work itself.",
    lines: [
      "This isn't suburban outpatient care—it's rotating crews, contractors, emergencies, and regulators asking hard questions after the fact.",
      "Enterprise-grade capability shouldn't require enterprise-grade friction: multi-year projects, endless consultants, or a patchwork of tools that fail underground and under pressure.",
      "We exist to make healthcare safer, faster, and more transparent where extraction and processing actually happen.",
    ],
  },
  {
    id: "v2-fragmentation",
    kind: "statement",
    label: "Why · Stakes",
    title: "When health and safety data scatter, everyone pays.",
    lines: [
      "Visits in one place, incidents in another, testing in spreadsheets, ambulance checks on paper, policies in shared drives.",
      "Fragmentation means latency when seconds matter, weak oversight when leadership needs one operational picture, and weak proof of duty of care across employees—and contractors.",
    ],
  },
  {
    id: "v2-reality",
    kind: "split",
    label: "Why · Reality",
    title: "Healthcare built for mining reality.",
    lines: [
      "Underground and open-pit constraints—not hospital schedules.",
      "Co-designed with on-site doctors, nurses, and safety officers; workflows iterated with real feedback on visits, hydration and D&A, duties, and incidents.",
      "Multi-site, multi-company, multi-tenant from day one—mother company and contractors, with clean separation and traceability.",
    ],
  },
  {
    id: "v2-principles",
    kind: "pillars",
    label: "Why · Principles",
    title: "Clinical-grade. Mining-aware. Compliance by design.",
    blocks: [
      {
        title: "Clinical-grade",
        body: "Experiences that feel natural for medical staff—not only for software teams.",
      },
      {
        title: "Mining-aware",
        body: "Offline windows, underground connectivity, and shift-based work are first-class constraints in our roadmap and design choices.",
      },
      {
        title: "Compliance by design",
        body: "Auditability, separation of duties, and reporting baked in—not bolted on after launch.",
      },
      {
        title: "Production-ready",
        body: "Cloud-native posture and a fast deployment story versus endless implementation projects.",
      },
    ],
  },
  {
    id: "v2-bridge",
    kind: "statement",
    label: "Bridge",
    title: "Belief without discipline is just a slogan.",
    lines: [
      "The why is the promise to your workforce and regulators.",
      "The how is tenant isolation, role-based access, audit trails, and one data model so clinical, safety, and logistics don't fork.",
      "Then—and only then—the what: the modules you enable for your site.",
    ],
  },
  {
    id: "v2-how",
    kind: "statement",
    label: "How",
    title: "One operational layer—not a dozen tools pretending to talk.",
    lines: [
      "Tenants per site or operation—clean boundaries.",
      "Company-level separation—mother company and contractors in one system with tight access rules.",
      "Row-level security and audit trail—access explainable, changes traceable.",
      "A unified picture of risk—operations, testing, and healthcare feeding leadership visibility (with documented direction for offline/sync where connectivity fails).",
    ],
  },
  {
    id: "v2-what-intro",
    kind: "statement",
    label: "What · Scope",
    title: "One system. Every angle.",
    lines: [
      "Healthcare, testing, inventory, operations, and compliance—purpose-built for mining, without generic-HMS gaps.",
      "The next slides mirror how we organize the product on our public Features page—so you can map story to site.",
    ],
  },
  {
    id: "v2-clinical",
    kind: "grid",
    label: "What · Clinical",
    title: "Healthcare management",
    subtitle:
      "Patient-centric care, medical visits, records, and incident management—all in one place with full audit trail.",
    blocks: [
      {
        title: "Patient management",
        body: "Multi-company tracking, clearance, emergency contacts.",
      },
      {
        title: "Medical visits",
        body: "Vitals, treatments, work restrictions, follow-ups.",
      },
      {
        title: "Medical records",
        body: "Unified records, appointments, triage & vitals.",
      },
      {
        title: "Incident management",
        body: "FAP reporting, ambulance tracking, compliance.",
      },
    ],
  },
  {
    id: "v2-testing",
    kind: "grid",
    label: "What · Compliance",
    title: "Drug, alcohol & hydration testing",
    subtitle:
      "End-to-end programmes: perform tests, schedule random pools, chain of custody, and compliance reporting.",
    blocks: [
      {
        title: "Programme execution",
        body: "D&A and hydration workflows, scheduling, and evidence suitable for occupational health programmes.",
      },
      {
        title: "Scheduling & pools",
        body: "Random pools, compliance tracking, and planned testing—aligned to how sites actually run programmes.",
      },
      {
        title: "Reporting",
        body: "Analytics and outputs leadership and audits can rely on—not spreadsheets assembled at the last minute.",
      },
    ],
  },
  {
    id: "v2-people-ops",
    kind: "pillars",
    label: "What · People & ops",
    title: "Wellbeing and scheduling",
    blocks: [
      {
        title: "Our people",
        body: "Wellbeing hub, employee follow-ups, medication declarations, feedback and surveys—workforce health tied to the clinic.",
      },
      {
        title: "Operations",
        body: "Health appointments, operational duties, assignment history, and reports—obligations visible, not tribal knowledge.",
      },
    ],
  },
  {
    id: "v2-inventory",
    kind: "statement",
    label: "What · Supply chain",
    title: "Inventory management",
    lines: [
      "Medical inventory, stock transfers, transactions, purchase orders, suppliers, and equipment tracking—with expiry alerts and audit trail.",
      "Inventory · Stock transfers · Transactions · Purchase orders · Suppliers · Equipment tracking",
    ],
  },
  {
    id: "v2-platform",
    kind: "statement",
    label: "What · Platform",
    title: "Administration & infrastructure",
    lines: [
      "Settings, admin panel, super admin, audit trail, multi-tenant architecture, security, and real-time updates.",
      "Plus documentation for admins and power users—guides and technical reference—so the system stays governable after go-live.",
      "Governance layers in the live product also include a published SOP library and a patient portal foundation; details fit naturally in demo and deep dives.",
    ],
  },
  {
    id: "v2-close",
    kind: "closing",
    label: "Next",
    title: "MineAid HMS",
    subtitle: "Built to make healthcare safer, faster, and more transparent in mining.",
    lines: [
      "If the why matches your operation, the what becomes a structured walkthrough—not a mystery sale.",
      "Next: live conversation with your clinical and safety stakeholders, then a bounded pilot definition.",
      "Public site: Features, About, Security, and Changelog on MineAid HMS.",
    ],
  },
];
