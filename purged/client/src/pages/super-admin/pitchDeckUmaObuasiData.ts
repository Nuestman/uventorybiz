/**
 * UMA Obuasi — Underground Mining Alliance contractor pitch deck.
 * Source narrative: docs/UMA_OBUASI_MINEAID_PITCH_SOURCE.md
 * Route: /super-admin/pitch-uma-obuasi
 */

import type { PitchSlide } from "./pitchDeckTypes";

export const PITCH_SLIDES_UMA_OBUASI: PitchSlide[] = [
  {
    id: "uma-title",
    kind: "hero",
    label: "Intro",
    title: "MineAid HMS",
    subtitle:
      "UMA Obuasi — Underground Mining Alliance. Digitize what your First Aiders already do: stop paper copied at the FAP into separate Excel—one governed layer for workforce health, testing, follow-ups, and declarations.",
    footnote: "Confidential · for UMA Obuasi stakeholders · ← → Space · fullscreen",
  },
  {
    id: "uma-credibility",
    kind: "statement",
    label: "Who is speaking",
    title: "AGAHF supervisor—same FAP your First Aiders use.",
    lines: [
      "Emergency nurse and Emergency Response Supervisor with AGAHF: First Aid Post (FAP) / Emergency Response Posts (ERPs), coordinated with the hospital Emergency Department.",
      "UMA First Aiders are peers in the same environment—many were colleagues in the same ED and FAPs. I see them copy paper records of their staff at the FAP into UMA’s own Excel.",
      "Pursuing MSc Health Informatics at KNUST (in progress). MineAid is disciplined HIM for mining—shaped in part by what First Aiders do when they come to pick their data.",
      "Founder of UFoundBEC (community basic emergency care and road-safety outreach).",
    ],
  },
  {
    id: "uma-national",
    kind: "statement",
    label: "National & global direction",
    title: "Traceable health data—not binders and private spreadsheets.",
    lines: [
      "Serious health systems expect digital, auditable records that can follow the worker—with privacy and continuity.",
      "On a regulated mine, parallel paper at the FAP plus re-keyed Excel is hard to defend when oversight asks who saw what, when.",
      "MineAid aligns contractor workforce health with that direction—without inventing new bureaucracy.",
    ],
  },
  {
    id: "uma-mining-context",
    kind: "statement",
    label: "Why this site is different",
    title: "One pit—operator, health contractor, mining contractor.",
    lines: [
      "AGA Obuasi: the operator sets the frame; AGAHF delivers on-site health; UMA runs major underground operations—each with its own workforce and duties.",
      "Workers touch clinics, posts, testing, follow-ups, and incidents—often across employer boundaries on the same site.",
      "When information does not flow, First Aiders and nurses compensate with trips, copies, and informal channels—neither scalable nor audit-ready.",
    ],
  },
  {
    id: "uma-contractor-split",
    kind: "pillars",
    label: "System landscape",
    title: "Clinical record at FAP—UMA’s picture rebuilt in Excel.",
    blocks: [
      {
        title: "Two narratives",
        body: "Encounters live in AGAHF’s paper/digital world at the FAP; UMA First Aiders often recreate their slice in spreadsheets by hand from copies.",
      },
      {
        title: "Health IM ad hoc",
        body: "Without a deliberate model, contractor OH data ends up in files and cells—not a governed system of record both sides trust equally.",
      },
      {
        title: "The question",
        body: "For this UMA worker, across time and role: where is the single authoritative, permissioned health story?",
      },
    ],
  },
  {
    id: "uma-paper-excel",
    kind: "statement",
    label: "Current pattern",
    title: "Pen-and-paper copy at FAP—then Excel at UMA.",
    lines: [
      "First Aiders travel to the FAP to transcribe paper about their staff into UMA’s Excel—double entry, delay, and transcription error.",
      "Skeletal spreadsheets lack clinical depth and audit trail when leadership or partners ask hard questions.",
      "Every extra copy weakens confidentiality control compared with role-based digital access.",
    ],
  },
  {
    id: "uma-fragmentation",
    kind: "split",
    label: "Fragmentation",
    title: "Same worker—FAP chart and UMA sheet can drift apart.",
    lines: [
      "Updates at different times and different fields: supervisors see spreadsheet reality, not live operational truth.",
      "Rotations and multiple posts: the next First Aider may not inherit a clean, shared digital thread.",
      "Hydration/testing, follow-ups, and meds declarations live in daily practice but not in one governed workflow for UMA.",
      "Risk: duplicated effort, inconsistent reporting, weak M&E for UMA management and friction with clinical partners.",
    ],
  },
  {
    id: "uma-oversight",
    kind: "statement",
    label: "Oversight & quality",
    title: "Leadership cannot manage what arrives late as Excel.",
    lines: [
      "When consolidation is manual, oversight and quality metrics lag the shift where the risk actually happened.",
      "Standards drift when protocols are not embedded in one system First Aiders actually use.",
      "Follow-ups and checks need a durable trail—not only notebooks and personal files.",
    ],
  },
  {
    id: "uma-inventory",
    kind: "statement",
    label: "Supply chain",
    title: "Readiness still depends on stock where First Aiders work.",
    lines: [
      "Disconnected lists mean shortages, expiry waste, and surprises—weak link between consumption, encounters, and forecasting.",
      "Underground and post-level readiness needs the right consumables at the right time—not guesswork.",
    ],
  },
  {
    id: "uma-goals",
    kind: "grid",
    label: "Outcomes we want",
    title: "What “good” looks like for UMA",
    blocks: [
      {
        title: "First Aiders first",
        body: "Governed digital workflows—not re-keying from paper; less time at the copier, more time with crews.",
      },
      {
        title: "Modules you already run",
        body: "Hydration/testing, employee follow-ups, medication declarations—structured to match daily routines MineAid was already inspired by.",
      },
      {
        title: "Leadership clarity",
        body: "Dashboards and reports from one pipeline—not end-of-month Excel merges.",
      },
      {
        title: "AGAHF alignment",
        body: "Clear handover and roles: clinical authority where it belongs; UMA sees what it is entitled to for its workforce.",
      },
      {
        title: "Privacy & RBAC",
        body: "Role-based access and audit trails suited to serious health data across contractors.",
      },
      {
        title: "Policy fit",
        body: "Digitized, defensible records—UMA not stuck behind national and global expectations.",
      },
    ],
  },
  {
    id: "uma-mineaid",
    kind: "pillars",
    label: "MineAid response",
    title: "Mining-native—digitize UMA’s processes, don’t replace them.",
    blocks: [
      {
        title: "Structured records",
        body: "Visits, programmes, testing, incidents—with auditability instead of paper + skeletal Excel.",
      },
      {
        title: "Tenant & roles",
        body: "Design so UMA workforce data is available to UMA roles under agreement—without breaking clinical governance at AGAHF.",
      },
      {
        title: "Supervision & visibility",
        body: "Dashboards and reports so managers see trends—not only what someone remembered to type up.",
      },
      {
        title: "Inventory discipline",
        body: "Movements and alerts aligned to how posts and crews actually consume stock.",
      },
    ],
  },
  {
    id: "uma-our-people",
    kind: "pillars",
    label: "Employee wellbeing",
    title: "The work First Aiders do every day—in the system.",
    blocks: [
      {
        title: "Follow-ups that stick",
        body: "Structured follow-through so cases are tracked—not lost between shifts or roster changes.",
      },
      {
        title: "Trust with workforce",
        body: "Dignified channels between crews and occupational health; complements safety culture underground.",
      },
      {
        title: "Rotation-proof",
        body: "Context carries forward when the person on duty changes—no reset to zero each handover.",
      },
    ],
  },
  {
    id: "uma-partnership",
    kind: "statement",
    label: "Partnership",
    title: "UMA + AGAHF + operator—contracts and data explicit.",
    lines: [
      "MineAid supports UMA’s duty of care; it does not replace AGA or AGAHF governance. Priorities, data rules, procurement, and clear ownership still need UMA and partner leadership at the table.",
      "We name the multi-contractor site openly so roles, agreements, and data responsibilities stay clear—especially where clinical and contractor records meet.",
      "First, align on real problems with UMA First Aiders, OHSE, and management—ground truth from the people who run the work, not deck assumptions.",
      "Then run a bounded pilot—for example one workforce slice plus agreed modules (e.g. testing/follow-ups/meds)—and scale when metrics and frontline feedback justify it.",
    ],
  },
  {
    id: "uma-close",
    kind: "closing",
    label: "Next",
    title: "MineAid HMS",
    subtitle: "For UMA Obuasi: less copying, more governed care—when you are ready to pilot with your First Aiders.",
    lines: [
      "Next: discovery with First Aiders and UMA leads; align pilot scope and success measures with AGAHF where handover matters.",
      "Live demo: First Aider day and leadership views mapped to MineAid—not a generic tour.",
      "Narrative source: docs/UMA_OBUASI_MINEAID_PITCH_SOURCE.md",
    ],
  },
];
