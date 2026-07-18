# MineAid HMS — Business Proposal

**Enterprise health information management for mining operations**

| | |
|---|---|
| **Document type** | Business proposal (illustrative framework) |
| **Audience** | Mining operators, group occupational health, procurement |
| **Classification** | Confidential — qualified partners and prospects |
| **Date** | April 2026 |

---

## 1. Executive summary

MineAid HMS is a **production-ready, multi-tenant platform** for **health information management (HIM)** tailored to mining: on-site clinics, contractors, rotating crews, emergency medical response, and the safety and compliance expectations that surround them.

This proposal outlines **why** a mine-specific system matters, **what** MineAid delivers today (aligned to the current product baseline), **how** we typically engage from first conversation to scaled rollout, and **how** commercial structures are usually framed—without substituting a signed statement of work or contract; those remain subject to mutual agreement.

---

## 2. Context: the problem we solve

Mining organisations routinely manage health and safety information across **many disconnected channels**: clinical records, incident systems, spreadsheets for testing programmes, paper or ad hoc ambulance checks, and policy documents in shared drives.

That fragmentation drives:

- **Slower response** when clinical and safety data are not in one operational picture.
- **Weaker governance** when audit trails and role boundaries are inconsistent.
- **Higher risk** when proving **duty of care** across employees and contractors under scrutiny.

Generic hospital-centric EMRs rarely reflect **fitness-for-duty**, **referral to site-configured facilities**, **multi-company workforces**, or **ambulance and stock** in the same workflow layer.

---

## 3. Proposed solution: MineAid HMS

MineAid HMS provides **tenant-isolated**, **role-based** access to a **single system** spanning:

- **Clinical & occupational health** — patients, medical visits, appointments, records, referrals and disposition, extended health-profile fields where enabled.
- **Safety & operations** — incidents, operational duties, assignment history, reporting, staff ticketing.
- **Response & supply** — Ambulance & EMS (fleet, pre-start, unit detail, on-board inventory and transfers), inventory and procurement flows, equipment tracking, on-site testing scheduling and reporting.
- **People & governance** — Employee wellbeing wellbeing tools, published **SOP library** with admin authoring (versioning and approval), tenant administration, audit logging, and a **patient portal foundation** with a documented direction toward **offline/sync** for low-connectivity environments.

Technical baseline (high level): **React / TypeScript** client, **Express** API, **PostgreSQL** with **Drizzle ORM**, session-based security, patterns suitable for cloud deployment (e.g. Vercel, Neon, object storage for attachments)—as implemented in the current codebase.

---

## 4. Scope of supply (product, not custom SOW)

Unless otherwise agreed in writing, **delivery is the MineAid HMS software platform** as released, plus standard **tenant provisioning**, **configuration** (roles, locations, referral facilities, modules enabled), **training** appropriate to the phase, and **support** per the agreed tier.

**Explicitly out of scope** unless separately contracted: bespoke development, third-party clinical device integration, legal or regulatory sign-off on your behalf, and data migration from legacy systems beyond agreed assistance.

---

## 5. Engagement model (typical phases)

| Phase | Purpose | Typical activities |
|--------|---------|-------------------|
| **Discovery** | Align on pain points, sites, and compliance themes | Workshops with medical, safety, and IT; review current tools and data flows |
| **Pilot** | Prove value on a bounded footprint | One tenant (or one primary site), defined roles and modules, success metrics (e.g. time-to-record, adoption) |
| **Rollout** | Scale to additional sites / contractors | Additional tenants or hierarchy expansion, training waves, integration backlog |
| **Steady state** | Operate and evolve | Releases aligned to product roadmap; optional enhancement backlog |

Timelines are **indicative** and depend on client readiness, data migration complexity, and integration scope.

---

## 6. Commercial framework (illustrative)

Commercial terms are **agreed per operator**. Common dimensions include:

- **Tenancy** — sites or organisational units modelled as tenants.
- **Users** — active seats or role bundles (medical, safety, admin, EMT, etc.).
- **Plan tier** — alignment to feature sets (e.g. Basic / Premium / Enterprise style plans where applicable).
- **Support & SLA** — response targets, named contacts, release communication.

**No pricing appears in this template document**; proposals with numbers are issued under commercial control and NDA as appropriate.

---

## 7. Assumptions & dependencies

- Client provides **timely access** to stakeholders and test environments where needed.
- Client is responsible for **clinical governance**, **local regulatory interpretation**, and **end-user policies** on their side.
- **Connectivity** and **identity** decisions (e.g. SSO) are agreed during discovery if required.
- Product capabilities evolve; **roadmap items** (e.g. deeper offline-first) are documented separately from this baseline proposal.

---

## 8. Why MineAid (summary)

| Theme | Benefit |
|--------|---------|
| **Built for mining** | Workflows reflect site reality, not only outpatient care. |
| **One platform** | Fewer fragile integrations between clinical, safety, and logistics data. |
| **Trust** | Multi-tenant isolation, RBAC, audit logging aligned to serious operations. |
| **Modern stack** | Maintainable, deployable, extensible architecture. |

---

## 9. Next steps & acceptance

1. **Structured demonstration** of MineAid HMS against your stated HIM and safety priorities.  
2. **Pilot definition** — scope, success criteria, timeline, and responsible parties.  
3. **Commercial and legal** — order form or contract, data processing terms as required.  

**Contact:** public **Contact** page on the MineAid HMS site, or your MineAid relationship owner.

---

*Reference: concept note `docs/MINEAID_ENTERPRISE_CONCEPT_NOTE.md`; product version and modules `docs/VERSION.md`, `docs/IMPLEMENTATION_STATUS.md`. In-app print/PDF: Super Admin → **Enterprise business proposal** (`/super-admin/business-proposal`).*
