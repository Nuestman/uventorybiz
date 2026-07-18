-- Sync patient ID sequences with existing rows (fixes duplicate ma0001-YY after seeds/restores)

CREATE OR REPLACE FUNCTION generate_patient_id() RETURNS VARCHAR AS $$
DECLARE
  year_suffix VARCHAR(2);
  sequence_name TEXT;
  next_number INTEGER;
  max_existing INTEGER;
  seq_last BIGINT;
  new_id VARCHAR;
BEGIN
  year_suffix := TO_CHAR(CURRENT_DATE, 'YY');
  sequence_name := 'patient_id_seq_' || year_suffix;

  SELECT COALESCE(MAX((substring(id FROM 3 FOR 4))::INTEGER), 0)
  INTO max_existing
  FROM patients
  WHERE id ~ ('^ma[0-9]{4}-' || year_suffix || '$');

  IF NOT EXISTS (
    SELECT 1
    FROM pg_sequences
    WHERE schemaname = 'public'
      AND sequencename = sequence_name
  ) THEN
    IF max_existing = 0 THEN
      EXECUTE format('CREATE SEQUENCE %I START 1', sequence_name);
    ELSE
      EXECUTE format('CREATE SEQUENCE %I START %s', sequence_name, max_existing + 1);
    END IF;
  ELSE
    SELECT last_value
    INTO seq_last
    FROM pg_sequences
    WHERE schemaname = 'public'
      AND sequencename = sequence_name;

    IF max_existing > 0 AND max_existing >= seq_last THEN
      EXECUTE format('SELECT setval(%L, %s, false)', sequence_name, max_existing + 1);
    END IF;
  END IF;

  LOOP
    EXECUTE format('SELECT nextval(%L)', sequence_name) INTO next_number;
    new_id := 'ma' || LPAD(next_number::TEXT, 4, '0') || '-' || year_suffix;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM patients WHERE id = new_id);
  END LOOP;

  RETURN new_id;
END;
$$ LANGUAGE plpgsql;
