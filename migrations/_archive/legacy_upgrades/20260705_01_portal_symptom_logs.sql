-- Portal symptom tracker: catalog + patient self-reported log entries

CREATE TABLE IF NOT EXISTS symptom_types (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar REFERENCES tenants(id) ON DELETE CASCADE,
  code varchar NOT NULL,
  label varchar NOT NULL,
  category varchar NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT TRUE,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_symptom_types_system_code
  ON symptom_types (code) WHERE tenant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_symptom_types_tenant_code
  ON symptom_types (tenant_id, code) WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_symptom_types_tenant_active
  ON symptom_types (tenant_id, is_active, sort_order);

CREATE TABLE IF NOT EXISTS symptom_log_entries (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id varchar NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id varchar NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  portal_user_id varchar REFERENCES portal_users(id) ON DELETE SET NULL,
  symptom_type_id varchar NOT NULL REFERENCES symptom_types(id) ON DELETE RESTRICT,
  recorded_at timestamp NOT NULL,
  severity smallint NOT NULL CHECK (severity >= 1 AND severity <= 5),
  body_location varchar(120),
  duration_minutes integer,
  notes text,
  source varchar NOT NULL DEFAULT 'patient_self',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_symptom_log_tenant_patient_at
  ON symptom_log_entries (tenant_id, patient_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_symptom_log_patient_type
  ON symptom_log_entries (patient_id, symptom_type_id);

-- System-default symptom catalog (occupational health oriented)
INSERT INTO symptom_types (code, label, category, sort_order)
SELECT v.code, v.label, v.category, v.sort_order
FROM (
  VALUES
    ('headache', 'Headache', 'general', 10),
    ('fatigue', 'Fatigue', 'general', 20),
    ('nausea_vomiting', 'Nausea / vomiting', 'gi', 30),
    ('dizziness', 'Dizziness', 'general', 40),
    ('chest_pain', 'Chest pain', 'cardiovascular', 50),
    ('shortness_of_breath', 'Shortness of breath', 'respiratory', 60),
    ('cough', 'Cough', 'respiratory', 70),
    ('abdominal_pain', 'Abdominal pain', 'gi', 80),
    ('muscle_joint_pain', 'Muscle / joint pain', 'musculoskeletal', 90),
    ('fever_chills', 'Fever / chills', 'general', 100),
    ('skin_rash', 'Skin rash', 'dermatology', 110),
    ('eye_irritation', 'Eye irritation', 'general', 120),
    ('hearing_changes', 'Hearing changes', 'general', 130),
    ('other', 'Other', 'general', 999)
) AS v(code, label, category, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM symptom_types st WHERE st.tenant_id IS NULL AND st.code = v.code
);
