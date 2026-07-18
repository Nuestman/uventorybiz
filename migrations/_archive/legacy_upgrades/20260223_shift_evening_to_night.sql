-- Migrate existing "evening" shift to "night" (shifts are now morning and night only)
UPDATE operational_duty_assignments SET shift = 'night' WHERE shift = 'evening';
