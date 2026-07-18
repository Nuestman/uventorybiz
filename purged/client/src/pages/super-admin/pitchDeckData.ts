/**
 * Version 1 — feature-centered enterprise pitch (`/super-admin/pitch`).
 * Wording reflects implemented product capabilities; avoid unsubstantiated claims.
 */

import type { PitchSlide } from "./pitchDeckTypes";

export type { PitchSlide, PitchSlideKind } from "./pitchDeckTypes";

export const PITCH_SLIDES: PitchSlide[] = [
  {
    id: "title",
    kind: "hero",
    label: "Intro",
    title: "MineAid HMS",
    subtitle:
      "Enterprise health information management for mining—clinical depth, operational truth, audit-ready governance.",
    footnote: "Super-admin presentation mode · use ← → or click the slide · F fullscreen",
  },
  {
    id: "reality",
    kind: "statement",
    label: "Reality",
    title: "Mine health is not hospital health.",
    lines: [
      "Rotating crews, contractors, remote clinics, and emergency response create data that generic EMRs were never shaped to hold.",
      "When incidents, visits, testing, ambulance readiness, and policies live in different tools, leadership loses a single operational picture—and clinicians lose seconds they do not have.",
    ],
  },
  {
    id: "promise",
    kind: "pillars",
    label: "Promise",
    title: "One platform. Your tenant. Your workforce.",
    blocks: [
      {
        title: "Clinical & occupational",
        body: "Patients, medical visits, appointments, records, referrals, disposition, and on-site testing programmes—in one coherent workflow.",
      },
      {
        title: "Safety & operations",
        body: "Incidents, operational duties, assignment history, operational reporting, and structured staff tickets for the organisation.",
      },
      {
        title: "Response & materiel",
        body: "Ambulance & EMS: fleet register, pre-start discipline, unit detail, and ambulance-scoped inventory movements.",
      },
      {
        title: "Governance & trust",
        body: "Published SOP library with admin authoring; role-based access; audit logging; strong multi-tenant isolation.",
      },
    ],
  },
  {
    id: "clinical",
    kind: "split",
    label: "Clinical",
    title: "Care that matches how mine clinics run",
    lines: [
      "Registration and longitudinal patient context, including extended health-profile fields where enabled.",
      "Medical visits with vitals, examination, treatment plan, work disposition, and items dispensed—traced to the encounter.",
      "Appointments across routine, incident follow-up, pre-employment, and fitness-for-duty patterns.",
      "Referral facilities tenant-scoped; transfers captured with structured facility selection.",
    ],
  },
  {
    id: "safety",
    kind: "split",
    label: "Safety",
    title: "From near-miss to closed loop",
    lines: [
      "Incident reporting with types, severity, lifecycle status, witnesses, and follow-up.",
      "Operational duties and assignment history so daily medical obligations are visible, not tribal knowledge.",
      "Dashboards and reports orient leadership around what is happening on the ground.",
    ],
  },
  {
    id: "ems-inventory",
    kind: "grid",
    label: "EMS & stock",
    title: "Ambulance, stock, and equipment in the same system",
    blocks: [
      {
        title: "Ambulance & EMS",
        body: "Fleet CRUD, stationing and status, pre-start checks, unit pages with on-board stock, movements, transfers—including receive of in-transit stock.",
      },
      {
        title: "Inventory",
        body: "Overview, transfers, transactions, purchase orders, suppliers, equipment tracking, and history—aligned to real site supply practice.",
      },
      {
        title: "Testing programmes",
        body: "On-site scheduling, result capture, and reporting for drug, alcohol, and related occupational testing workflows.",
      },
    ],
  },
  {
    id: "people-sop",
    kind: "grid",
    label: "People & SOPs",
    title: "Workforce wellbeing and living procedures",
    blocks: [
      {
        title: "Employee wellbeing",
        body: "Follow-ups, medications visibility, feedback channels, and materials that connect workforce health to the clinic.",
      },
      {
        title: "SOP library",
        body: "Published procedures for all staff; tenant admins author with versioning and approval—HTML content and attachments supported.",
      },
      {
        title: "Patient portal (foundation)",
        body: "Separate portal sign-in, tenant settings, and patient-facing routes—for engagement that grows with your roadmap.",
      },
    ],
  },
  {
    id: "trust",
    kind: "pillars",
    label: "Trust",
    title: "Architecture you can defend in an audit",
    blocks: [
      {
        title: "Isolation",
        body: "Hierarchical tenants: organisations, companies, employees, users, and patients—scoped consistently through the API and data model.",
      },
      {
        title: "Roles",
        body: "RBAC across clinical, admin, safety, EMT, and super-admin contexts; sensitive clinical paths guarded server-side.",
      },
      {
        title: "Evidence",
        body: "Audit-oriented logging on key clinical and administrative actions—designed for serious operations, not toy demos.",
      },
    ],
  },
  {
    id: "stack",
    kind: "statement",
    label: "Technology",
    title: "Modern stack. Deployed like software should be in 2026.",
    lines: [
      "React 18, TypeScript, Tailwind/shadcn UI—fast, accessible operator experience.",
      "Express and Drizzle on PostgreSQL—predictable APIs and migrations.",
      "Session security, email notifications, file storage patterns suitable for cloud hosting (e.g. Vercel, Neon).",
      "Documented direction for offline/sync where connectivity is never guaranteed underground or in the pit.",
    ],
  },
  {
    id: "who",
    kind: "split",
    label: "Who",
    title: "Built with—and for—mine health leadership",
    lines: [
      "Medical directors and site physicians who need fidelity in the record.",
      "Occupational health, safety officers, and EMT crews who need clarity under pressure.",
      "Tenant administrators who must onboard users, locations, and contractors without calling a vendor for every change.",
      "Corporate and super-admin operators who provision tenants, plans, and platform oversight.",
    ],
  },
  {
    id: "engage",
    kind: "grid",
    label: "Engagement",
    title: "How we win together",
    blocks: [
      {
        title: "Discover",
        body: "Map your current HIM fragments and non-negotiable compliance themes.",
      },
      {
        title: "Pilot",
        body: "Stand up a tenant, roles, and a bounded module set; measure adoption and time-to-record.",
      },
      {
        title: "Scale",
        body: "Roll additional sites, contractors, and integrations; align roadmap to your underground and enterprise standards.",
      },
    ],
  },
  {
    id: "close",
    kind: "closing",
    label: "Next",
    title: "MineAid HMS",
    subtitle:
      "Replace fragmentation with a single, mine-native health information system—implemented today, extensible tomorrow.",
    lines: [
      "Schedule a live walkthrough with your clinical and safety stakeholders.",
      "Reference: public Features, Security, and Changelog pages; internal implementation status in repository documentation.",
    ],
  },
];
