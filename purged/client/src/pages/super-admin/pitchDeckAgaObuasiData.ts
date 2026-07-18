/**
 * AGA Obuasi mine — personalized pitch deck.
 * Source narrative: docs/AGA_OBUASI_MINEAID_PITCH_SOURCE.md
 * Route: /super-admin/pitch-aga-obuasi
 */

import type { PitchSlide } from "./pitchDeckTypes";

export const PITCH_SLIDES_AGA_OBUASI: PitchSlide[] = [
  {
    id: "aga-title",
    kind: "hero",
    label: "Intro",
    title: "MineAid HMS",
    subtitle:
      "AngloGold Ashanti — Obuasi Mine. A governed health information layer for clinical care, occupational health, and pre-hospital coordination—not paper, partial spreadsheets, and scattered files.",
    footnote: "Confidential · for AGA Obuasi stakeholders · ← → Space · fullscreen",
  },
  {
    id: "aga-credibility",
    kind: "statement",
    label: "Who is speaking",
    title: "Clinical on the ground—training for the digital future.",
    lines: [
      "Emergency nurse and Emergency Response Supervisor at AGAHF: First Aid Post (FAP) / Emergency Response Posts (ERPs), coordinated with the hospital Emergency Department.",
      "On-site clinics are run under a contractor model—not direct mine payroll. Saying that out loud keeps procurement and data agreements aligned with who actually delivers care.",
      "Focus areas: pre-hospital care, preparedness, and disaster response. Founder of UFoundBEC (community basic emergency care and road-safety outreach).",
      "Pursuing MSc Health Informatics at KNUST (in progress). MineAid is built as disciplined HIM—not a spreadsheet or ad-hoc software.",
    ],
  },
  {
    id: "aga-national",
    kind: "statement",
    label: "National & global direction",
    title: "Digitize and centralize health data—so care is continuous wherever the patient accesses it.",
    lines: [
      "Ghana and serious health systems worldwide expect the record to follow the worker or patient—with security, auditability, and continuity.",
      "A regulated mining operation on paper charts and skeletal Excel is out of step with that direction and carries privacy, M&E, and compliance risk.",
      "MineAid aims to align Obuasi with national digitization momentum and international good practice—not technology for fashion.",
    ],
  },
  {
    id: "aga-mining-context",
    kind: "statement",
    label: "Why mining is different",
    title: "Mining health is not suburban outpatient IT.",
    lines: [
      "Multiple touchpoints: clinics, response posts, ED handover, follow-up—plus rotating staff and contractors.",
      "Occupational programmes, incidents, testing, pre-hospital and ambulance pathways, inventory and equipment tied to patient safety.",
      "When the information layer does not match that reality, teams rely on heroics and informal channels—neither scalable nor defensible.",
    ],
  },
  {
    id: "aga-ohse",
    kind: "pillars",
    label: "System landscape",
    title: "OHSE is serious—but health needs its own digital home.",
    blocks: [
      {
        title: "Safety tooling leads",
        body: "Digital and procedural energy often flows to safety systems; health can sit folded inside instead of having end-to-end HIM.",
      },
      {
        title: "Health IM under-weighted",
        body: "Limited emphasis on health information managers compared with other mining disciplines; health data ends up “shoved in somewhere.”",
      },
      {
        title: "The question",
        body: "Where is the authoritative record for this worker, incident, programme, or handover—across time, site, and role?",
      },
    ],
  },
  {
    id: "aga-paper",
    kind: "statement",
    label: "Current pattern",
    title: "Paper plus partial Excel—critical detail left behind.",
    lines: [
      "Skeletal data in spreadsheets without the clinical depth needed for continuity and audit.",
      "Weak confidentiality: physical records can be seen by people who are not clinical staff.",
      "Regulatory programmes need traceability—paper and ad hoc files struggle to show who saw what, when, and why.",
    ],
  },
  {
    id: "aga-fragmentation",
    kind: "split",
    label: "Fragmentation",
    title: "One patient—many doors. No single record.",
    lines: [
      "Multiple clinics and rotations: inconsistent or misleading histories; clinicians start partly blind.",
      "Movement between departments or locations without portable, governed data.",
      "Duplication physically and technically—medical care, testing, incidents, ambulance, SOPs not in one workflow for medical staff.",
      "Risk: duplicated tests, conflicting plans, delayed care, weak reporting to leadership and regulators.",
    ],
  },
  {
    id: "aga-oversight",
    kind: "statement",
    label: "Oversight & quality",
    title: "You cannot be in five places at once.",
    lines: [
      "Supervision and M&E suffer when everything depends on informal updates.",
      "Variable standards when protocols and records are not embedded in one system.",
      "Ambulance and equipment checks may happen but leave no durable trail; issues reported to one colleague stall when both rotate off—no central queue to closure.",
    ],
  },
  {
    id: "aga-inventory",
    kind: "statement",
    label: "Supply chain",
    title: "Paper inventory lists put patients and readiness at risk.",
    lines: [
      "Over- and under-stock, shortages, expiry wastage—weak link between consumption, encounters, and forecasting.",
      "Emergency readiness and clinical care depend on having the right stock at the right time.",
    ],
  },
  {
    id: "aga-operational-readiness",
    kind: "statement",
    label: "Operational readiness",
    title: "What is needed to make MineAid operational at Obuasi.",
    lines: [
      "Core requirement: basic workstation availability at each care location, staff network access, and agreed ownership for endpoint support.",
      "Current situation: there are currently no PCs at the care locations.",
      "Connectivity baseline: Wi-Fi is available at all locations, but staff do not currently have access credentials (password access not provided).",
      "Wired access: ODD, STP, and KMS posts have LAN ports; GCS is the exception and needs a connectivity plan.",
      "Minimum go-live checklist: device provisioning, staff network credentials, endpoint hardening, and local support escalation path per post.",
    ],
  },
  {
    id: "aga-goals",
    kind: "grid",
    label: "Outcomes we want",
    title: "What “good” looks like at Obuasi",
    blocks: [
      {
        title: "Timely EMR access",
        body: "Right context at clinic, post, and ED handover—not locked in a folder.",
      },
      {
        title: "Standardized care",
        body: "Multiple clinic sites behaving like one clinical service with clear documentation.",
      },
      {
        title: "Safer, leaner care",
        body: "Fewer errors, less duplicated testing and prescribing, better ROI and clinician time.",
      },
      {
        title: "Continuity & trust",
        body: "Shared operational picture for nurses, doctors, safety, and hospital ED where appropriate.",
      },
      {
        title: "Privacy & RBAC",
        body: "Role-based access and audit trails that match the seriousness of health data.",
      },
      {
        title: "Policy alignment",
        body: "Digitized, governed data in line with national direction—Obuasi not behind the global standard.",
      },
    ],
  },
  {
    id: "aga-mineaid",
    kind: "pillars",
    label: "MineAid response",
    title: "A mining-native system—not a hospital EMR bolt-on.",
    blocks: [
      {
        title: "Structured records",
        body: "Patients, visits, programmes, incidents, testing—with auditability instead of paper + skeletal Excel.",
      },
      {
        title: "One tenant, right roles",
        body: "Scattered clinics under a coherent model: clinical, safety, and admin see what they should—no more silo guessing.",
      },
      {
        title: "Pre-hospital & ops visibility",
        body: "Ambulance and equipment checks documented; supervision supported by dashboards and reports—not only physical presence.",
      },
      {
        title: "Inventory with discipline",
        body: "Movements, alerts, and history aligned to how the site actually consumes stock.",
      },
    ],
  },
  {
    id: "aga-our-people",
    kind: "pillars",
    label: "Employee wellbeing",
    title: "Wellbeing and engagement—not only charts.",
    blocks: [
      {
        title: "Early risk & follow-through",
        body: "Wellbeing hub, follow-ups, and structured channels so issues are tracked—not lost between shifts.",
      },
      {
        title: "Trust",
        body: "Dignified communication between workforce and occupational health; complements safety culture.",
      },
      {
        title: "Rotation-proof context",
        body: "Wellbeing and clinical context that does not reset every time staffing changes.",
      },
    ],
  },
  {
    id: "aga-partnership",
    kind: "statement",
    label: "Partnership",
    title: "Support OHSE—give the “H” procurement and ownership clarity.",
    lines: [
      "MineAid backs the health side of OHSE; it does not replace AGA’s governance. Priorities, data rules, procurement, and clear data ownership still need clinical and operator leadership at the table.",
      "Where care is contractor-delivered, we state that plainly so roles, contracts, and data responsibilities are explicit. That protects trust and avoids “who actually owns this?” gaps later.",
      "First, align on the real problems with clinical, occupational health, IT, and safety—ground truth from the people who run the service, not assumptions from a slide.",
      "Then run a bounded pilot—for example a clinic cluster, ED handover, clinical documentation, and one inventory slice—and scale only when agreed metrics and frontline feedback justify a wider rollout.",
    ],
  },
  {
    id: "aga-operational-readiness",
    kind: "statement",
    label: "Operational readiness",
    title: "What is needed to make MineAid operational at AGA Obuasi.",
    lines: [
      "Core requirement: basic workstation availability at each care location, staff network access (wired/wireless).",
      "Current situation at FAPs:",
      "1. None of the FAPs have PCs.",
      "2. Wired access: ODD, STP, and KMS posts have extra LAN ports; GCS is the exception and needs a connectivity plan.",
      "3. Wireless - Wi-Fi is available at all locations, but FAP staff do not currently have access credentials (password access not provided).",
      // "Minimum go-live checklist: device provisioning, staff network credentials, endpoint hardening, and local support escalation path per post.",
    ],
  },
  {
    id: "aga-close",
    kind: "closing",
    label: "Next",
    title: "MineAid HMS",
    subtitle: "Safer, faster, more transparent health information for Obuasi—when the operation is ready to govern it properly.",
    lines: [
      "Next: validate priorities with clinical, occupational health, IT, and safety—then pilot scope and success measures.",
      "Live demo: Obuasi workflows mapped to the product—not a generic tour.",
      "Narrative source: docs/AGA_OBUASI_MINEAID_PITCH_SOURCE.md",
    ],
  },
];
