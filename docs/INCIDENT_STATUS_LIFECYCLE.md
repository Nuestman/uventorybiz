# Incident status lifecycle

**Last updated:** June 12, 2026

---

## Status values

| Status | Meaning |
|--------|---------|
| `open` | Reported; initial triage / response not yet complete |
| `investigating` | Active investigation, root-cause analysis, or corrective actions in progress |
| `resolved` | **Substantive work complete** — patient treated, immediate hazards addressed, corrective actions documented or underway; record may still await formal sign-off |
| `closed` | **Administratively closed** — no further workflow on this record; suitable for reporting archives and compliance extracts |

---

## Resolved vs closed — why both?

They are **not duplicates**:

- **Resolved** = clinical/operational closure (“the incident is handled”).
- **Closed** = records closure (“this case file is finished”).

Typical flow: `open` → `investigating` → `resolved` → `closed`.

You may close directly from `open` or `investigating` for minor events, but **resolved** allows a period where safety or medical leads verify actions before final **closed**.

**Reports:** KPI “closed pipeline” counts both `resolved` and `closed` as non-open for backlog metrics. The **status mix** chart shows them separately so you can see cases awaiting final close.

---

## Drills and simulations

Some incidents are **exercises**, not real events. When staff choose **Close incident**, they confirm whether the record is a drill/simulation (`is_drill_or_simulation = true`).

- **Real incidents** — included in operational and compliance incident counts.
- **Drills/simulations** — tracked separately on `/reports/incidents` and `/reports/compliance`; excluded from real-incident KPIs by default.

Migration: `migrations/20260612_03_incident_drill_simulation.sql`
