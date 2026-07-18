-- Store blood glucose in mmol/L (decimal) and optional fasting vs random context.
-- Safe to re-run: skips columns already migrated; works with medical_visits or encounters.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vital_signs'
      AND column_name = 'glucose_level'
      AND udt_name IN ('int4', 'float4', 'float8')
  ) THEN
    ALTER TABLE vital_signs
      ALTER COLUMN glucose_level TYPE numeric(4,1)
      USING (
        CASE
          WHEN glucose_level IS NULL THEN NULL
          WHEN glucose_level > 30 THEN ROUND((glucose_level::numeric / 18.0), 1)
          ELSE glucose_level::numeric
        END
      );
  END IF;
END $$;

ALTER TABLE vital_signs
  ADD COLUMN IF NOT EXISTS glucose_context varchar(10);

DO $$
DECLARE
  visit_table text;
BEGIN
  SELECT CASE
    WHEN to_regclass('public.encounters') IS NOT NULL THEN 'encounters'
    WHEN to_regclass('public.medical_visits') IS NOT NULL THEN 'medical_visits'
    ELSE NULL
  END
  INTO visit_table;

  IF visit_table IS NULL THEN
    RAISE NOTICE 'No encounters/medical_visits table found; skipping visit glucose migration';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = visit_table
      AND column_name = 'glucose_level'
      AND udt_name IN ('int4', 'float4', 'float8')
  ) THEN
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN glucose_level TYPE numeric(4,1) USING (
        CASE
          WHEN glucose_level IS NULL THEN NULL
          WHEN glucose_level > 30 THEN ROUND((glucose_level::numeric / 18.0), 1)
          ELSE glucose_level::numeric
        END
      )',
      visit_table
    );
  END IF;

  EXECUTE format(
    'ALTER TABLE %I ADD COLUMN IF NOT EXISTS glucose_context varchar(10)',
    visit_table
  );

  EXECUTE format(
    'COMMENT ON COLUMN %I.glucose_level IS %L',
    visit_table,
    'Blood glucose in mmol/L'
  );

  EXECUTE format(
    'COMMENT ON COLUMN %I.glucose_context IS %L',
    visit_table,
    'fbs = fasting blood sugar, rbs = random blood sugar'
  );
END $$;

COMMENT ON COLUMN vital_signs.glucose_level IS 'Blood glucose in mmol/L';
COMMENT ON COLUMN vital_signs.glucose_context IS 'fbs = fasting blood sugar, rbs = random blood sugar';
