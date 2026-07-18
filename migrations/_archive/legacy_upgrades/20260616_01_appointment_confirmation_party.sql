-- Track who must confirm after schedule changes (patient reschedule → staff; staff reschedule → patient).
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS confirmation_required_from varchar(16);

COMMENT ON COLUMN appointments.confirmation_required_from IS
  'When status=scheduled: patient or staff must confirm the slot. NULL when confirmed or no pending confirmation.';

UPDATE appointments
SET confirmation_required_from = 'patient'
WHERE status = 'scheduled'
  AND confirmation_required_from IS NULL;
