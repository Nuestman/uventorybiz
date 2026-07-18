# MineAid HMS — Pitch Deck Version 2: Start With Why

**Narrative model:** Simon Sinek’s Golden Circle (*Start With Why*) — lead with **WHY** (belief and stakes), then **HOW** (approach and proof of intent), then **WHAT** (capabilities). Features sit last so they *confirm* a decision the audience already emotionally understands.

**Relationship to Version 1:** Version 1 (`/super-admin/pitch`, `pitchDeckData.ts`) remains the **feature-centered** walkthrough. Version 2 is the **generalized “why”** story for any mining operator; a future **Version 3** can personalize to a primary target company.

**Source copy:** Aligned with public **`/`** (Landing), **`/about`**, and **`/features`** (especially Features page section order for the WHAT act).

**In-app:** Super Admin → **Pitch deck (Why)** → `/super-admin/pitch-why`

---

## Deck map (Golden Circle)

| Act | Slides (approx.) | Intent |
|-----|------------------|--------|
| **WHY** | 1–7 | Title, Golden Circle, belief, fragmentation, mining reality, principles, bridge |
| **HOW** | 8 | One system: isolation, companies, audit, unified risk picture |
| **WHAT** | 9–14 | Mirror **Features** sections: framing → Clinical → Testing → People & ops → Inventory → Platform |
| **Close** | 15 | Invitation aligned with About / Features CTAs |

---

## Slide 1 — Title (hero)

- **Visual:** Full MineAid HMS logo (as in app).
- **Subtitle:** *Start with why — then show how we build — then what the product is.* Generalized for any mining health leader.
- **Footer note:** Version 2 · Start With Why · Confidential

**Speaker note:** Frame the next ~15 slides as a story, not a feature tour. “We’ll get to modules—but only after the reason they exist.”

---

## Slide 2 — The order of the story (WHY first)

- **Label:** Golden Circle
- **Headline:** *People don’t buy what you do—they buy why you do it.*
- **Body (paraphrase Sinek):** Most organizations say: what we make, how it’s different, maybe why it matters. Inspired leaders and organizations start from the inside out: **Why** (purpose / belief), **How** (values / discipline), **What** (proof). When the **why** resonates, the **what** is easy to understand—it feels *obvious*.

**Speaker note:** This slide licenses you to spend real time on belief and pain before showing screens or module lists.

---

## Slide 3 — WHY: The belief (WHY we exist)

- **Label:** Why · Belief
- **Headline:** *Every mining workforce deserves healthcare information that is as serious as the work itself.*
- **Bullets (from About mission CTA tone):**
  - Mining health isn’t clinic-in-a-suburb—it’s **rotating crews**, **contractors**, **emergencies**, and **regulators** asking hard questions after the fact.
  - **Enterprise-grade** tools shouldn’t require **enterprise-grade friction**—multi-year projects, armies of consultants, or a patchwork of tools that fail underground and under pressure.
  - MineAid exists to make healthcare **safer, faster, and more transparent** where extraction and processing actually happen.

**Speaker note:** This is the emotional center. Pause. Let them nod—or argue. Either is useful.

---

## Slide 4 — WHY: The cost of fragmentation

- **Label:** Why · Stakes
- **Headline:** *When health and safety data scatter, everyone pays.*
- **Bullets (concept / Landing / About themes):**
  - Visits in one place, **incidents** in another, **testing** in spreadsheets, **ambulance** checks on paper, **policies** in shared drives.
  - Fragmentation means **latency** when seconds matter, **weak oversight** when leadership needs a single operational picture, and **weak proof** of **duty of care** across employees **and contractors**.

**Speaker note:** Don’t name competitors yet—name *the feeling* of chasing PDFs at 2 a.m. before an audit.

---

## Slide 5 — WHY: Mining reality (split slide)

- **Left label:** Why · Reality  
- **Left headline:** *Healthcare built for mining reality.*
- **Right bullets (About hero + story):**
  - **Underground** and **open-pit** constraints—not outpatient schedules.
  - **Co-designed** with on-site doctors, nurses, and safety officers; workflows iterated with **real feedback** (visits, hydration and D&A, duties, incidents).
  - **Multi-site, multi-company, multi-tenant** from day one—mother company **and** contractors, with clean separation and traceability.

**Speaker note:** “Generic hospital EMRs weren’t built for your pit, your FIFO roster, or your contractor model.”

---

## Slide 6 — WHY: How we think (design principles)

- **Label:** Why · Principles
- **Headline:** *Clinical-grade. Mining-aware. Compliance by design.*
- **Four blocks (pillars layout, from About “Design principles”):**
  - **Clinical-grade** — experiences that feel natural for **medical staff**, not only for IT.
  - **Mining-aware** — **offline windows**, **underground connectivity**, **shift-based** work are first-class constraints in our roadmap and design choices.
  - **Compliance by design** — **auditability**, separation of duties, reporting **baked in**, not bolted on after launch.
  - **Production-ready** — cloud-native posture, fast deployment story vs. endless implementation (About / Landing themes).

**Speaker note:** These are promises. HOW slide will show how architecture backs them.

---

## Slide 7 — WHY → HOW bridge

- **Label:** Bridge
- **Headline:** *Belief without discipline is just a slogan.*
- **Bullets:**
  - The **why** is the promise to your workforce and regulators.
  - The **how** is **tenant isolation**, **role-based access**, **audit trails**, and **one data model** so clinical, safety, and logistics don’t fork.
  - Then—and only then—the **what**: the modules you can turn on for your site.

**Speaker note:** Explicit transition: “So *how* does MineAid actually do that?”

---

## Slide 8 — HOW: One system, built to be defensible

- **Label:** How
- **Headline:** *One operational layer—not twelve tools pretending to talk to each other.*
- **Bullets (About architecture snapshot + trust themes):**
  - **Tenants** per site or operation—clean boundaries.
  - **Company-level separation**—mother company and contractors in one system with **tight access rules**.
  - **Row-level security & audit trail**—access explainable, changes traceable.
  - **Real-time insight**—operations, testing, and healthcare feeding a **unified picture of risk** (as far as connectivity allows; offline/sync documented as direction).

**Speaker note:** This is where IT and compliance lean in. Keep it crisp—no stack-worship.

---

## Slide 9 — WHAT: Framing (Features hero)

- **Label:** What · Scope
- **Headline:** *One system. Every angle.*
- **Subcopy (Features hero):** Healthcare, testing, inventory, operations, and compliance—**purpose-built for mining**, without generic-HMS gaps.
- **Line:** The next slides mirror how we **organize the product** on our public Features page—so you can map story to site.

**Speaker note:** “Now the tour—but short. You already know *why* it exists.”

---

## Slide 10 — WHAT: Clinical (Features § Healthcare management)

- **Label:** What · Clinical
- **Headline:** *Healthcare management*
- **Intro line (Features):** Patient-centric care, medical visits, records, and incident management—all in one place with full audit trail.
- **Four blocks (Features list):**
  - **Patient management** — Multi-company tracking, clearance, emergency contacts.
  - **Medical visits** — Vitals, treatments, work restrictions, follow-ups.
  - **Medical records** — Unified records, appointments, triage & vitals.
  - **Incident management** — FAP reporting, ambulance tracking, compliance.

---

## Slide 11 — WHAT: Testing (Features § Drug, alcohol & hydration)

- **Label:** What · Compliance
- **Headline:** *Drug, alcohol & hydration testing*
- **Intro (Features):** End-to-end programmes: perform tests, schedule random pools, chain of custody, and compliance reporting.
- **Three columns / blocks (condensed):**
  - **Programme execution** — D&A&H workflows, MRO path where applicable.
  - **Scheduling & pools** — Random pools, compliance tracking, scheduling.
  - **Reporting** — Analytics and evidence for leadership and audits.

---

## Slide 12 — WHAT: People & operations (Features § Wellbeing and scheduling)

- **Label:** What · People & ops
- **Headline:** *Wellbeing and scheduling*
- **Intro (Features):** Employee follow-ups, Work fitness & medications, feedback, appointments, duties, and reports.
- **Two pillars:**
  - **Employee wellbeing** — Wellbeing hub, follow-ups, Work fitness & medications, feedback & surveys.
  - **Operations** — Health appointments, operational duties, assignment history, reports.

---

## Slide 13 — WHAT: Inventory (Features § Inventory management)

- **Label:** What · Supply chain
- **Headline:** *Inventory management*
- **Body (Features):** Medical inventory, stock transfers, transactions, purchase orders, suppliers, and equipment tracking—with expiry alerts and audit trail.
- **Tags line (from Features chips):** Inventory · Stock transfers · Transactions · Purchase orders · Suppliers · Equipment tracking

---

## Slide 14 — WHAT: Platform (Features § Administration & infrastructure)

- **Label:** What · Platform
- **Headline:** *Administration & infrastructure*
- **Intro (Features):** Settings, admin panel, super admin, audit trail, multi-tenant architecture, security, and real-time updates.
- **Grid items (short):** Settings · Admin panel · Super admin · Audit trail · Multi-tenant · Security · Real-time · Cloud-native  
- **Plus:** **Documentation** for admins and power users (Features resources strip)—guides and technical reference.

**Speaker note:** Position SOP library and patient portal foundation as part of “governance + engagement” if asked—details can follow in demo.

---

## Slide 15 — Close (closing layout)

- **Logo**
- **Subtitle (About mission):** *Built to make healthcare safer, faster, and more transparent in mining.*
- **Lines:**
  - If the **why** matches your operation, the **what** is a structured walkthrough—not a sales mystery.
  - **Next step:** live conversation with your clinical and safety stakeholders—then a bounded pilot definition.
  - **Public:** Features, About, Security, Changelog on the MineAid HMS site.

**Speaker note:** End on belief + clear next action; avoid feature dump in the last thirty seconds.

---

## Optional appendix (not in default deck)

- Landing **“Why MineAid”** pillars (mining-specific, cost story, deploy speed)—use only if audience is **commercially** motivated early; otherwise risk pulling them back to “feature compare” too soon.
- Patient portal foundation, SOP library, Ambulance & EMS—mention in Q&A or Version 1 deck.

---

## Maintenance

- When **Landing / About / Features** copy changes materially, update **`pitchDeckV2Data.ts`** and this doc in the same PR where possible.
- **Version 3 (personalized):** duplicate `pitchDeckV2Data.ts` → `pitchDeckV3Data.ts` (or tenant-specific JSON) with swapped slides 3–5 and a dedicated “you” headline; keep shell unchanged.
