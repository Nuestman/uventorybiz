-- Patient preferred care location on portal appointment requests (in-person)

ALTER TABLE portal_appointment_requests
  ADD COLUMN IF NOT EXISTS preferred_location_id VARCHAR REFERENCES care_locations(id) ON DELETE SET NULL;
