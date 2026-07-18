-- uventorybiz: drop legacy clinical tables (post-purge cleanup).
-- NOTE: patients (+ generate_patient_id() and patient_status enum) are KEPT — the wellbeing
-- module (patient follow-ups), portal patient party, and messaging still depend on them.
-- encounter_modality enum is KEPT (appointments.modality, portal_appointment_requests.preferred_modality).
-- conversation_type enum keeps its legacy 'encounter_thread' value (removing enum values is unsafe;
-- new conversations no longer use it).
-- Idempotent: IF EXISTS everywhere.

-- 1) Drop clinical FK columns from KEPT tables ---------------------------------------------------

-- appointments: deprecated encounter/telecare linkage (FKs already dropped in 0003, repeat for safety)
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_encounter_id_encounters_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_telecare_session_id_telecare_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "encounter_id";
--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN IF EXISTS "telecare_session_id";
--> statement-breakpoint

-- conversations: encounter thread linkage
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_encounter_id_encounters_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "encounter_id";
--> statement-breakpoint

-- employee_feedback: medical visit linkage
ALTER TABLE "employee_feedback" DROP CONSTRAINT IF EXISTS "employee_feedback_medical_visit_id_encounters_id_fk";
--> statement-breakpoint
ALTER TABLE "employee_feedback" DROP COLUMN IF EXISTS "medical_visit_id";
--> statement-breakpoint

-- employee_work_fitness_cases: medical visit linkage
ALTER TABLE "employee_work_fitness_cases" DROP CONSTRAINT IF EXISTS "employee_work_fitness_cases_related_medical_visit_id_encounters_id_fk";
--> statement-breakpoint
ALTER TABLE "employee_work_fitness_cases" DROP COLUMN IF EXISTS "related_medical_visit_id";
--> statement-breakpoint

-- patient_follow_ups: medical visit linkage (table itself is KEPT for wellbeing)
ALTER TABLE "patient_follow_ups" DROP CONSTRAINT IF EXISTS "patient_follow_ups_medical_visit_id_encounters_id_fk";
--> statement-breakpoint
ALTER TABLE "patient_follow_ups" DROP COLUMN IF EXISTS "medical_visit_id";
--> statement-breakpoint

-- inventory_transactions: medical visit linkage (patient_id is KEPT)
ALTER TABLE "inventory_transactions" DROP CONSTRAINT IF EXISTS "inventory_transactions_medical_visit_id_encounters_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_transactions" DROP COLUMN IF EXISTS "medical_visit_id";
--> statement-breakpoint

-- 2) Break circular FKs among clinical tables so plain drops work --------------------------------

ALTER TABLE "encounters" DROP CONSTRAINT IF EXISTS "encounters_triage_id_triage_id_fk";
--> statement-breakpoint
ALTER TABLE "triage" DROP CONSTRAINT IF EXISTS "triage_vital_signs_id_vital_signs_id_fk";
--> statement-breakpoint

-- 3) Drop clinical tables, children first ---------------------------------------------------------

DROP TABLE IF EXISTS "interop_transfers";
--> statement-breakpoint
DROP TABLE IF EXISTS "interop_partners";
--> statement-breakpoint
DROP TABLE IF EXISTS "vital_signs";
--> statement-breakpoint
DROP TABLE IF EXISTS "triage";
--> statement-breakpoint
DROP TABLE IF EXISTS "encounters";
--> statement-breakpoint
DROP TABLE IF EXISTS "telecare_sessions";
--> statement-breakpoint
DROP TABLE IF EXISTS "symptom_log_entries";
--> statement-breakpoint
DROP TABLE IF EXISTS "symptom_types";
--> statement-breakpoint
DROP TABLE IF EXISTS "procedures";
--> statement-breakpoint
DROP TABLE IF EXISTS "resource_identifiers";
--> statement-breakpoint

-- Legacy pre-rename tables (never in drizzle migrations; may exist in older environments)
DROP TABLE IF EXISTS "medical_records" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "medical_visits" CASCADE;
