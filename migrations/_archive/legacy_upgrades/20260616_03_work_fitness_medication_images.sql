-- Medication package photos for work fitness declarations (brand identification)
ALTER TABLE employee_work_fitness_medications
  ADD COLUMN IF NOT EXISTS medication_image_url TEXT;
