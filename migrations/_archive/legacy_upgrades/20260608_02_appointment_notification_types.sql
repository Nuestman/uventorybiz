-- Appointment lifecycle notification types (schedule, patient actions, no-show)

INSERT INTO notification_types (key, category, display_name, description, severity_supported) VALUES
  ('appointment_scheduled', 'appointments', 'Appointment Scheduled', 'A new appointment was scheduled and is awaiting patient confirmation', FALSE),
  ('appointment_patient_confirmed', 'appointments', 'Patient Confirmed Visit', 'A patient confirmed their scheduled appointment in the portal', FALSE),
  ('appointment_patient_declined', 'appointments', 'Patient Declined Visit', 'A patient declined a scheduled appointment in the portal', FALSE),
  ('appointment_patient_cancelled', 'appointments', 'Patient Cancelled Visit', 'A patient cancelled a previously confirmed appointment', FALSE),
  ('appointment_no_show', 'appointments', 'Appointment No-Show', 'An appointment was automatically marked as no-show after the grace period', FALSE)
ON CONFLICT (key) DO NOTHING;
