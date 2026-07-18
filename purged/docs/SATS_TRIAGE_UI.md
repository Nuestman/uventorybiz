# SATS Triage UI – Three-Part Flow

**Status:** UI implemented; backend to be wired later.  
**Location:** Medical Visit page → **Triage** tab.

---

## Overview

The triage interface follows the South African Triage Scale (SATS) in three parts:

1. **Part 1 – Vitals & TEWS**  
   Record physiology (Mobility, RR, HR, Systolic BP, Temp, AVPU, Trauma). Each parameter has **value** and **score** columns. Scores are summed to give the **TEWS** (Triage Early Warning Score). The TEWS value **auto-assigns** a physiology-based acuity (Red/Orange/Yellow/Green).

2. **Part 2 – Discriminators**  
   User selects one or more **clinical discriminators** from a dropdown. Each discriminator is mapped to an acuity level. Selection is used for Part 3.

3. **Part 3 – Final triage**  
   The **final triage colour** is **auto-assigned from the discriminator(s)** (e.g. worst acuity among selected discriminators). When no discriminator is selected, the final triage can fall back to the Part 1 (TEWS) acuity.  
   *(Exact rule—e.g. “discriminator overrides TEWS” vs “worst of both”—to be confirmed when wiring logic.)*

---

## Part 1 – Vitals and TEWS

### Parameters (value + score)

| Parameter      | Description              | Value column        | Score column      |
|----------------|--------------------------|---------------------|-------------------|
| **Mobility**   | Patient mobility         | Dropdown (e.g. Walk, Sticks/crutch, Bedbound) | 0–2 (from value) |
| **RR**         | Respiratory rate (/min)  | Number or range     | 0–3 (from value)  |
| **HR**         | Heart rate (bpm)         | Number or range     | 0–3 (from value)  |
| **Systolic BP**| Systolic blood pressure (mmHg) | Number        | 0–3 (from value)  |
| **Temp**       | Temperature (°C)         | Number or range     | 0–3 (from value)  |
| **AVPU**       | Consciousness            | Alert / Voice / Pain / Unresponsive | 0–3 |
| **Trauma**     | Trauma present           | Yes / No            | 0 or 2            |

- Each row shows **Value** (user input or selection) and **Score** (derived from lookup tables; not user-editable in the UI).
- **TEWS** = sum of all seven scores.  
- **TEWS acuity** = mapping from TEWS total to one of Red / Orange / Yellow / Green (e.g. 0–1 Green, 2–3 Yellow, 4–5 Orange, 6+ Red; exact bands to be set when wiring backend).

---

## Part 2 – Discriminators

- **Control:** Dropdown (multi-select or single, as designed).
- **Content:** Predefined list of SATS clinical discriminators (e.g. airway compromise, severe bleeding, GCS &lt; 15, chest pain, stroke symptoms, etc.).
- **Mapping:** Each discriminator has a **fixed acuity** (Red, Orange, Yellow, or Green). The list and mapping are defined in the frontend (and can later be driven by backend).
- **Purpose:** Selection drives **Part 3 – Final triage**.

---

## Part 3 – Final triage

- **Source:** Derived from **discriminator(s)** selected in Part 2.
  - If multiple discriminators are selected, the final triage is typically the **worst** (most urgent) acuity among them.
  - If **no** discriminator is selected, the final triage can default to the **Part 1 (TEWS) acuity**.
- **Display:** Final triage is **auto-assigned** and shown as the triage colour (and optionally label) that will be saved (e.g. “Final: Red – Immediate”).
- Backend will later receive this final acuity (and optionally TEWS + discriminator list) when the form is submitted.

---

## Data flow (for backend wiring)

1. **Part 1**  
   - Stored or sent: raw values (Mobility, RR, HR, Systolic BP, Temp, AVPU, Trauma), plus **TEWS** (sum) and **TEWS-derived acuity**.

2. **Part 2**  
   - Stored or sent: list of **selected discriminator IDs or codes** (and optionally their mapped acuities).

3. **Part 3**  
   - Stored or sent: **Final acuity** (red | orange | yellow | green) to be written to `triage.acuity` (and used for display/queue).

When the backend is wired, the same form can submit:  
`tewsScore`, `acuity` (final), `clinicalDiscriminators` (e.g. JSON array of selected discriminator keys), plus any new fields (e.g. mobility, avpu, trauma) if the schema is extended.

---

## UI placement

- **Page:** `/medical-visit`  
- **Tab:** **Triage** (first tab).  
- **Layout:**  
  - Part 1: Card “Part 1 – Vitals & TEWS” (table with Value | Score, then TEWS total and TEWS acuity).  
  - Part 2: Card “Part 2 – Discriminators” (dropdown, optional multi-select).  
  - Part 3: Card “Part 3 – Final triage” (read-only display of final acuity colour/label).  
  - Presenting complaint, triage date/time, notes, and Save (submit) as before; Save will be wired to backend later.
