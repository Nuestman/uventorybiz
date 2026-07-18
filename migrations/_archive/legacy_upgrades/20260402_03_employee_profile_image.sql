-- Canonical employee photo for staff + patient portal (single source of truth).
-- Migrates any legacy portal_users.avatar_url into employees.profile_image_url, then drops portal column.

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'portal_users'
      AND column_name = 'avatar_url'
  ) THEN
    UPDATE employees e
    SET profile_image_url = pu.avatar_url
    FROM portal_users pu
    INNER JOIN patients p ON p.id = pu.patient_id
    WHERE p.employee_id = e.id
      AND e.tenant_id = pu.tenant_id
      AND pu.avatar_url IS NOT NULL
      AND (e.profile_image_url IS NULL OR trim(e.profile_image_url) = '');
  END IF;
END $$;

ALTER TABLE portal_users
  DROP COLUMN IF EXISTS avatar_url;
