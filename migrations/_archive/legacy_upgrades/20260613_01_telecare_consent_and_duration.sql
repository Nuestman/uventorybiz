-- Patient telehealth consent + appointment duration for scheduled_end

ALTER TABLE telecare_sessions
  ADD COLUMN IF NOT EXISTS patient_telehealth_consent_at TIMESTAMP;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30;

COMMENT ON COLUMN telecare_sessions.patient_telehealth_consent_at IS 'When patient accepted telehealth care consent before joining';
COMMENT ON COLUMN appointments.duration_minutes IS 'Scheduled appointment slot length in minutes';

-- Backfill scheduled_end on sessions missing it
UPDATE telecare_sessions ts
SET scheduled_end = ts.scheduled_start + (COALESCE(a.duration_minutes, 30) * INTERVAL '1 minute')
FROM appointments a
WHERE ts.appointment_id = a.id
  AND ts.scheduled_end IS NULL;

UPDATE telecare_sessions
SET scheduled_end = scheduled_start + INTERVAL '30 minutes'
WHERE scheduled_end IS NULL;
