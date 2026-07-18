# Schema, Employee & Patient Model Updates (v3.3.0)

This document summarizes the structural and behavioral changes introduced in **v3.3.0** around employees, users, patients, medical visits, and incidents.

## 1. Gender Support

- **Database**
  - Added `gender` enum: `male`, `female`, `other`.
  - Added `gender` column to `employees` table.
- **Backend**
  - Exposed `gender` via Drizzle schema in `shared/schema.ts`.
  - Included `gender` in `InsertEmployee` and related types.
- **Frontend**
  - `Admin.tsx`: employee add/edit forms now include a gender `<Select>`.
  - `Patients.tsx` / `PatientDetails.tsx`: display employee gender in patient lists and detail views.

## 2. Users ↔ Employees Relationship

- `users.employeeId` now has a foreign key to `employees.id` with `ON DELETE SET NULL`.
- `server/storage.ts` includes a helper to synchronize select employee fields to the linked user:
  - `firstName`, `lastName`, `phoneNumber`.
- Super admins remain valid without an associated employee record.

## 3. Patient ID Format

- Introduced `generate_patient_id()` function:
  - Produces IDs like `ma0001-26` (`ma` prefix, 4‑digit sequence, last 2 digits of year).
  - Sequence resets per year (separate sequence per year suffix).
- `patients.id` default now calls `generate_patient_id()`, replacing raw UUIDs for patient‑visible IDs.

## 4. Last Menstrual Period (LMP) Fields

- **Database**
  - Added `last_menstrual_period` to:
    - `medical_visits`
    - `incident_reports`
- **Schemas**
  - `insertMedicalVisitSchema` and `insertIncidentReportSchema` extended to accept optional `lastMenstrualPeriod`.
- **Backend**
  - `createMedicalVisit` / `updateMedicalVisit`:
    - Normalize `lastMenstrualPeriod` before insert/update to match column type expectations.
  - `createIncidentReport` / `updateIncidentReport`:
    - Same normalization applied for incident LMP.
- **Frontend**
  - `MedicalVisit.tsx`:
    - Shows LMP date field only when the selected patient’s employee.gender is `female`.
  - `IncidentModal.tsx`:
    - Incident create/edit forms show LMP only for female patients.

## 5. Incidents UI & Modal Renaming

- Legacy `NewIncidentModal` has been removed and replaced by `IncidentModal`:
  - Single component used for both **new** and **edit** incident flows.
  - All imports now use `@/components/modals/IncidentModal`.
- `/incidents` page hardened against runtime errors:
  - Fixed missing `selectedPatientData` reference.
  - Added safe date formatting for incident dates.

## 6. TypeScript & Runtime Safety

- Aligned:
  - Zod insert schemas
  - Drizzle column definitions
  - React form types
  - Storage layer insert/update helpers
- Eliminated TypeScript errors around:
  - `lastMenstrualPeriod` type mismatches.
  - `selectedPatientData` in medical visit & incident flows.

