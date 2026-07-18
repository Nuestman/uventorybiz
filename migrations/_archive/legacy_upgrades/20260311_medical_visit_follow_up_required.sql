-- Add follow_up_required to medical_visits for Our People integration.
-- When true, a follow-up is auto-created and surfaced in Our People follow-ups list.
ALTER TABLE medical_visits ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN medical_visits.follow_up_required IS 'When true, an Our People follow-up is auto-created and linked to this visit';
