-- Secure messaging: conversations, participants, messages, audit log

CREATE TYPE conversation_type AS ENUM (
  'patient_staff',
  'staff_internal',
  'encounter_thread',
  'appointment_thread'
);

CREATE TYPE conversation_status AS ENUM ('open', 'closed', 'archived');

CREATE TYPE message_sender_type AS ENUM ('staff', 'portal', 'system');

CREATE TYPE messaging_participant_type AS ENUM ('staff', 'portal');

CREATE TYPE messaging_audit_actor_type AS ENUM ('staff', 'portal', 'system');

CREATE TABLE conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type conversation_type NOT NULL DEFAULT 'patient_staff',
  subject VARCHAR(255),
  patient_id VARCHAR REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id VARCHAR REFERENCES encounters(id) ON DELETE SET NULL,
  appointment_id VARCHAR REFERENCES appointments(id) ON DELETE SET NULL,
  status conversation_status NOT NULL DEFAULT 'open',
  assigned_staff_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP,
  last_message_preview VARCHAR(200),
  created_by_type messaging_participant_type NOT NULL,
  created_by_staff_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_by_portal_user_id VARCHAR REFERENCES portal_users(id) ON DELETE SET NULL,
  retention_until TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_tenant_last_message ON conversations(tenant_id, last_message_at DESC);
CREATE INDEX idx_conversations_tenant_patient ON conversations(tenant_id, patient_id);
CREATE INDEX idx_conversations_tenant_status ON conversations(tenant_id, status);

CREATE TABLE conversation_participants (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  participant_type messaging_participant_type NOT NULL,
  staff_user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  portal_user_id VARCHAR REFERENCES portal_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  left_at TIMESTAMP,
  last_read_at TIMESTAMP,
  notifications_muted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_participant_identity CHECK (
    (participant_type = 'staff' AND staff_user_id IS NOT NULL AND portal_user_id IS NULL)
    OR (participant_type = 'portal' AND portal_user_id IS NOT NULL AND staff_user_id IS NULL)
  )
);

CREATE UNIQUE INDEX uq_conversation_participants_staff
  ON conversation_participants(conversation_id, staff_user_id)
  WHERE staff_user_id IS NOT NULL;

CREATE UNIQUE INDEX uq_conversation_participants_portal
  ON conversation_participants(conversation_id, portal_user_id)
  WHERE portal_user_id IS NOT NULL;

CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);

CREATE TABLE messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type message_sender_type NOT NULL,
  sender_staff_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  sender_portal_user_id VARCHAR REFERENCES portal_users(id) ON DELETE SET NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  deleted_at TIMESTAMP,
  edited_at TIMESTAMP,
  client_message_id VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_messages_client_id
  ON messages(conversation_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);

CREATE TABLE message_attachments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message_id VARCHAR NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url VARCHAR(2048) NOT NULL,
  original_name VARCHAR(512) NOT NULL,
  mime_type VARCHAR(128),
  size_bytes INTEGER,
  uploaded_by_type messaging_participant_type NOT NULL,
  uploaded_by_staff_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  uploaded_by_portal_user_id VARCHAR REFERENCES portal_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_attachments_message ON message_attachments(message_id);

CREATE TABLE messaging_audit_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_type messaging_audit_actor_type NOT NULL,
  actor_staff_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  actor_portal_user_id VARCHAR REFERENCES portal_users(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  conversation_id VARCHAR REFERENCES conversations(id) ON DELETE SET NULL,
  message_id VARCHAR REFERENCES messages(id) ON DELETE SET NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messaging_audit_tenant_created ON messaging_audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_messaging_audit_conversation ON messaging_audit_log(conversation_id, created_at DESC);
