-- Rename morning shift to day shift (day 06:00–17:59, night 18:00–05:59)
UPDATE operational_duty_assignments SET shift = 'day' WHERE shift = 'morning';
