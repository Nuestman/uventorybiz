CREATE TYPE "public"."ambulance_ops_status" AS ENUM('available', 'deployed', 'standby', 'out_of_service');--> statement-breakpoint
CREATE TYPE "public"."ambulance_prestart_status" AS ENUM('draft', 'completed');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."care_location_kind" AS ENUM('fixed_site', 'ambulance');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('open', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('patient_staff', 'staff_internal', 'encounter_thread', 'appointment_thread');--> statement-breakpoint
CREATE TYPE "public"."dehydration_level" AS ENUM('normal', 'mild', 'moderate', 'severe');--> statement-breakpoint
CREATE TYPE "public"."department" AS ENUM('extraction', 'processing', 'maintenance', 'safety', 'administration');--> statement-breakpoint
CREATE TYPE "public"."encounter_modality" AS ENUM('in_person', 'telehealth', 'phone');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('new', 'in_review', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."final_test_result" AS ENUM('negative', 'positive', 'test_not_conducted', 'awaiting_confirmation');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."hydration_action" AS ENUM('continue_work', 'rest_hydrate', 'medical_evaluation', 'immediate_treatment');--> statement-breakpoint
CREATE TYPE "public"."hydration_level" AS ENUM('adequate', 'mild_dehydration', 'moderate_dehydration', 'severe_dehydration');--> statement-breakpoint
CREATE TYPE "public"."hydration_test_reason" AS ENUM('random', 'post_incident', 'on_demand', 'heat_illness_suspected', 'routine_check');--> statement-breakpoint
CREATE TYPE "public"."instant_test_result" AS ENUM('positive', 'negative', 'invalid');--> statement-breakpoint
CREATE TYPE "public"."instant_test_type" AS ENUM('hb', 'pregnancy', 'malaria', 'typhoid');--> statement-breakpoint
CREATE TYPE "public"."inventory_category" AS ENUM('medication', 'supplies', 'equipment', 'consumables');--> statement-breakpoint
CREATE TYPE "public"."inventory_status" AS ENUM('active', 'discontinued', 'recalled', 'faulty', 'maintenance');--> statement-breakpoint
CREATE TYPE "public"."maintenance_status" AS ENUM('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."maintenance_type" AS ENUM('preventive', 'corrective', 'calibration', 'inspection', 'daily_check');--> statement-breakpoint
CREATE TYPE "public"."message_sender_type" AS ENUM('staff', 'portal', 'system');--> statement-breakpoint
CREATE TYPE "public"."messaging_audit_actor_type" AS ENUM('staff', 'portal', 'system');--> statement-breakpoint
CREATE TYPE "public"."messaging_participant_type" AS ENUM('staff', 'portal');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'read');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('registration_request', 'status_change', 'password_reset', 'incident_alert', 'appointment_reminder', 'low_stock_alert', 'expiry_alert', 'equipment_maintenance_alert', 'equipment_failure_alert');--> statement-breakpoint
CREATE TYPE "public"."patient_status" AS ENUM('active', 'cleared', 'follow_up', 'incident', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('draft', 'pending_approval', 'approved', 'ordered', 'partially_received', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."specimen_type" AS ENUM('urine', 'saliva', 'hair', 'breath', 'blood');--> statement-breakpoint
CREATE TYPE "public"."tenant_sop_version_status" AS ENUM('draft', 'pending_approval', 'published', 'archived', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."test_mode" AS ENUM('simple', 'comprehensive');--> statement-breakpoint
CREATE TYPE "public"."test_reason" AS ENUM('pre_employment', 'random', 'post_incident', 'reasonable_suspicion', 'return_to_duty', 'follow_up', 'routine_screening');--> statement-breakpoint
CREATE TYPE "public"."test_result" AS ENUM('negative', 'positive', 'non-negative', 'dilute', 'invalid', 'pending', 'inconclusive');--> statement-breakpoint
CREATE TYPE "public"."test_status" AS ENUM('scheduled', 'collected', 'in_lab', 'results_pending', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."test_type" AS ENUM('drug', 'alcohol', 'hydration', 'combined');--> statement-breakpoint
CREATE TYPE "public"."testing_device" AS ENUM('drugcheck_3000', 'breathalyzer', 'comprehensive_lab', 'field_test', 'instant_test');--> statement-breakpoint
CREATE TYPE "public"."testing_program_type" AS ENUM('pre_employment', 'random', 'post_incident', 'reasonable_suspicion', 'return_to_duty', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'triaged', 'in_progress', 'resolved', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('receipt_external', 'receipt_transfer', 'issue_to_client', 'issue_internal', 'adjustment_increase', 'adjustment_decrease', 'transfer_out', 'transfer_in', 'return_from_client', 'return_to_supplier', 'disposal', 'requisition', 'receipt', 'issue', 'adjustment', 'transfer', 'return');--> statement-breakpoint
CREATE TYPE "public"."urine_color" AS ENUM('1', '2', '3', '4', '5', '6', '7', '8');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('medical_staff', 'safety_officer', 'emt', 'admin', 'super_admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending', 'active', 'blocked', 'decommissioned');--> statement-breakpoint
CREATE TYPE "public"."work_intensity" AS ENUM('light', 'moderate', 'heavy', 'extreme');--> statement-breakpoint
CREATE TABLE "alcohol_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"test_number" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"patient_id" varchar,
	"program_id" varchar,
	"location_id" varchar,
	"test_reason" "test_reason" NOT NULL,
	"test_mode" "test_mode" DEFAULT 'simple',
	"testing_device" varchar DEFAULT 'breathalyzer',
	"scheduled_date" date,
	"scheduled_time" varchar,
	"test_date" date,
	"test_time" varchar,
	"tester_name" varchar,
	"test_location" varchar,
	"alcohol_result" "test_result",
	"alcohol_level" varchar,
	"breathalyzer_reading" varchar,
	"device_serial_number" varchar,
	"lab_result" "test_result",
	"lab_alcohol_level" varchar,
	"final_result" "final_test_result",
	"disciplinary_action" text,
	"return_to_duty_required" boolean DEFAULT false,
	"follow_up_testing_required" boolean DEFAULT false,
	"status" "test_status" DEFAULT 'scheduled',
	"notes" text,
	"created_by" varchar NOT NULL,
	"reviewed_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "alcohol_tests_tenant_id_test_number_unique" UNIQUE("tenant_id","test_number")
);
--> statement-breakpoint
CREATE TABLE "ambulance_prestart_checks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"ambulance_location_id" varchar NOT NULL,
	"completed_by_user_id" varchar NOT NULL,
	"shift_date" date NOT NULL,
	"checked_at" timestamp DEFAULT now(),
	"status" "ambulance_prestart_status" DEFAULT 'draft' NOT NULL,
	"responses" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deficiencies_notes" text,
	"mileage_reading" varchar(32),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"patient_id" varchar NOT NULL,
	"medical_staff_id" varchar NOT NULL,
	"location_id" varchar,
	"appointment_date" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"appointment_type" varchar NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled',
	"modality" "encounter_modality" DEFAULT 'in_person' NOT NULL,
	"encounter_id" varchar,
	"telecare_session_id" varchar,
	"notes" text,
	"confirmation_required_from" varchar(16),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"action" varchar NOT NULL,
	"resource_type" varchar NOT NULL,
	"resource_id" varchar,
	"original_data" jsonb,
	"details" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "care_locations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"location_name" varchar NOT NULL,
	"location_code" varchar NOT NULL,
	"description" text,
	"address" text,
	"contact_phone" varchar,
	"contact_email" varchar,
	"latitude" varchar,
	"longitude" varchar,
	"is_primary" boolean DEFAULT false,
	"status" varchar DEFAULT 'active' NOT NULL,
	"location_kind" "care_location_kind" DEFAULT 'fixed_site' NOT NULL,
	"stationed_at_location_id" varchar,
	"call_sign" varchar(128),
	"registration_plate" varchar(64),
	"fleet_number" varchar(128),
	"coverage_notes" text,
	"ambulance_ops_status" "ambulance_ops_status",
	"capacity" integer,
	"operating_hours" text,
	"staff_count" integer DEFAULT 0,
	"capabilities" text,
	"equipment_list" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "care_locations_tenant_id_location_code_unique" UNIQUE("tenant_id","location_code"),
	CONSTRAINT "care_locations_tenant_id_location_name_unique" UNIQUE("tenant_id","location_name")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"company_type" varchar DEFAULT 'contractor' NOT NULL,
	"contact_email" varchar NOT NULL,
	"contact_phone" varchar,
	"address" text,
	"license_number" varchar,
	"status" varchar DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"conversation_id" varchar NOT NULL,
	"participant_type" "messaging_participant_type" NOT NULL,
	"staff_user_id" varchar,
	"portal_user_id" varchar,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"last_read_at" timestamp,
	"notifications_muted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"type" "conversation_type" DEFAULT 'patient_staff' NOT NULL,
	"subject" varchar(255),
	"patient_id" varchar,
	"encounter_id" varchar,
	"appointment_id" varchar,
	"status" "conversation_status" DEFAULT 'open' NOT NULL,
	"assigned_staff_user_id" varchar,
	"last_message_at" timestamp,
	"last_message_preview" varchar(200),
	"created_by_type" "messaging_participant_type" NOT NULL,
	"created_by_staff_user_id" varchar,
	"created_by_portal_user_id" varchar,
	"retention_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drug_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"test_number" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"patient_id" varchar,
	"program_id" varchar,
	"location_id" varchar,
	"test_reason" "test_reason" NOT NULL,
	"test_mode" "test_mode" DEFAULT 'simple',
	"specimen_type" "specimen_type" DEFAULT 'urine',
	"testing_device" "testing_device" DEFAULT 'drugcheck_3000',
	"scheduled_date" date,
	"scheduled_time" varchar,
	"collection_date" date,
	"collection_time" varchar,
	"collector_name" varchar,
	"collection_site" varchar,
	"chain_of_custody" varchar,
	"testing_lab" varchar,
	"result_date" date,
	"drug_result" "test_result",
	"substances_detected" text,
	"coc_result" "test_result",
	"opi_result" "test_result",
	"thc_result" "test_result",
	"amp_result" "test_result",
	"met_result" "test_result",
	"bzo_result" "test_result",
	"mro_review" boolean DEFAULT false,
	"mro_name" varchar,
	"mro_notes" text,
	"final_result" "final_test_result",
	"disciplinary_action" text,
	"return_to_duty_required" boolean DEFAULT false,
	"follow_up_testing_required" boolean DEFAULT false,
	"status" "test_status" DEFAULT 'scheduled',
	"notes" text,
	"created_by" varchar NOT NULL,
	"reviewed_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "drug_tests_tenant_id_test_number_unique" UNIQUE("tenant_id","test_number")
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"code" varchar NOT NULL,
	"expires" timestamp NOT NULL,
	"attempts" integer DEFAULT 0,
	"verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"location_id" varchar NOT NULL,
	"patient_id" varchar,
	"employee_id" varchar,
	"medical_visit_id" varchar,
	"anonymous" boolean DEFAULT false,
	"feedback_date" date DEFAULT now(),
	"feedback_type" varchar DEFAULT 'survey' NOT NULL,
	"survey_id" varchar,
	"responses" jsonb,
	"overall_experience_rating" integer,
	"staff_courtesy_rating" integer,
	"wait_time_rating" integer,
	"environment_cleanliness_rating" integer,
	"explanation_clarity_rating" integer,
	"perceived_safety_rating" integer,
	"would_recommend" boolean,
	"would_return" boolean,
	"free_text_feedback" text,
	"primary_category" varchar,
	"secondary_category" varchar,
	"sentiment" varchar,
	"tags" text[],
	"status" varchar DEFAULT 'new',
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"response_to_feedback" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_feedback_surveys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"version" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"questions" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employee_work_fitness_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"location_id" varchar,
	"employee_id" varchar NOT NULL,
	"case_type" varchar DEFAULT 'return_to_work' NOT NULL,
	"context_notes" text,
	"employee_feeling_notes" text,
	"related_medical_visit_id" varchar,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"submitted_by_employee" boolean DEFAULT true,
	"submitted_by_user_id" varchar,
	"status" varchar DEFAULT 'submitted' NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" varchar,
	"fitness_outcome" varchar,
	"fitness_impact" varchar,
	"work_restrictions" text,
	"restriction_start_date" date,
	"restriction_end_date" date,
	"cleared_underground" boolean,
	"cleared_heavy_machinery" boolean,
	"may_affect_drug_test" boolean DEFAULT false,
	"drug_test_disclosure_notes" text,
	"assessment_notes" text,
	"action_taken" varchar,
	"action_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by_user_id" varchar
);
--> statement-breakpoint
CREATE TABLE "employee_work_fitness_medications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"case_id" varchar NOT NULL,
	"medication_name" varchar NOT NULL,
	"generic_name" varchar,
	"strength" varchar,
	"dosage_form" varchar,
	"route" varchar,
	"frequency" varchar,
	"prescribed_for" text,
	"prescriber_name" varchar,
	"prescriber_facility" varchar,
	"start_date" date,
	"expected_end_date" date,
	"is_ongoing" boolean DEFAULT true,
	"employee_side_effects" text,
	"employee_no_side_effects" boolean DEFAULT false,
	"clinician_medication_notes" text,
	"medication_image_url" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"company_id" varchar NOT NULL,
	"employee_number" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar,
	"phone_number" varchar,
	"date_of_birth" date,
	"gender" "gender",
	"department" "department" NOT NULL,
	"position" varchar NOT NULL,
	"job_title" varchar NOT NULL,
	"hire_date" date NOT NULL,
	"emergency_contact_name" varchar,
	"emergency_contact_phone" varchar,
	"profile_image_url" text,
	"medical_clearance" boolean DEFAULT true,
	"status" varchar DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employees_tenant_id_employee_number_unique" UNIQUE("tenant_id","employee_number")
);
--> statement-breakpoint
CREATE TABLE "encounters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"patient_id" varchar NOT NULL,
	"medical_staff_id" varchar NOT NULL,
	"location_id" varchar,
	"modality" "encounter_modality" DEFAULT 'in_person' NOT NULL,
	"pathway" varchar(64) DEFAULT 'routine_clinic' NOT NULL,
	"appointment_id" varchar,
	"telecare_session_id" varchar,
	"patient_location_note" text,
	"visit_date" timestamp NOT NULL,
	"visit_type" varchar DEFAULT 'clinical' NOT NULL,
	"triage_required" boolean DEFAULT false NOT NULL,
	"chief_complaint" text,
	"history_of_present_illness" text,
	"blood_pressure_systolic" integer,
	"blood_pressure_diastolic" integer,
	"heart_rate" integer,
	"temperature" varchar,
	"respiratory_rate" integer,
	"oxygen_saturation" integer,
	"glucose_level" real,
	"glucose_context" varchar,
	"pain_score" integer,
	"weight" varchar,
	"height" varchar,
	"primary_survey" text,
	"sample_history" text,
	"physical_examination" text,
	"assessment" text,
	"treatment" text,
	"medications" text,
	"detained_at_facility" boolean,
	"procedures" text,
	"disposition_date_time" timestamp,
	"disposition" varchar,
	"transfer_facility_id" varchar,
	"transfer_facility_other" text,
	"ambulance_used" boolean,
	"work_restrictions" text,
	"follow_up_date" timestamp,
	"follow_up_instructions" text,
	"follow_up_required" boolean DEFAULT false,
	"notes" text,
	"last_menstrual_period" date,
	"status" varchar DEFAULT 'arrived',
	"arrived_at" timestamp,
	"finished_at" timestamp,
	"cancelled_at" timestamp,
	"triage_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipment_maintenance" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"equipment_id" varchar NOT NULL,
	"maintenance_type" "maintenance_type" NOT NULL,
	"scheduled_date" date NOT NULL,
	"completed_date" date,
	"maintenance_description" text NOT NULL,
	"technician_name" varchar,
	"service_company" varchar,
	"cost" varchar,
	"next_maintenance_date" date,
	"certification_expires" date,
	"status" "maintenance_status" DEFAULT 'scheduled',
	"completed_by" varchar,
	"issues_found" boolean DEFAULT false,
	"issue_description" text,
	"equipment_status" "inventory_status" DEFAULT 'active',
	"attachments" text,
	"notes" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"tenant_id" varchar,
	"path" varchar NOT NULL,
	"context" varchar,
	"kind" varchar DEFAULT 'global' NOT NULL,
	"ux_rating" integer,
	"ui_rating" integer,
	"navigation_rating" integer,
	"speed_rating" integer,
	"reliability_rating" integer,
	"nps_score" integer,
	"areas_used" jsonb,
	"comment" text,
	"contact_email" varchar,
	"status" "feedback_status" DEFAULT 'new' NOT NULL,
	"admin_note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hydration_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"test_number" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"patient_id" varchar,
	"program_id" varchar,
	"location_id" varchar,
	"test_reason" "hydration_test_reason" NOT NULL,
	"test_location" varchar,
	"ug_personnel" boolean DEFAULT false,
	"scheduled_date" date,
	"scheduled_time" varchar,
	"test_date" date,
	"test_time" varchar,
	"ambient_temperature" varchar,
	"humidity" varchar,
	"work_intensity" "work_intensity",
	"urine_color" "urine_color",
	"urine_specific_gravity" varchar,
	"body_weight_before" varchar,
	"body_weight_after" varchar,
	"weight_loss_percentage" varchar,
	"skin_turgor" "hydration_level",
	"mucous_membranes" "hydration_level",
	"mental_status" varchar,
	"vital_signs" text,
	"hydration_level" "hydration_level" NOT NULL,
	"hydration_score" integer,
	"recommended_action" "hydration_action",
	"treatment_provided" boolean DEFAULT false,
	"treatment_notes" text,
	"return_to_work_cleared" boolean DEFAULT false,
	"follow_up_required" boolean DEFAULT false,
	"follow_up_date" date,
	"status" "test_status" DEFAULT 'scheduled',
	"notes" text,
	"tested_by" varchar NOT NULL,
	"reviewed_by" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "hydration_tests_tenant_id_test_number_unique" UNIQUE("tenant_id","test_number")
);
--> statement-breakpoint
CREATE TABLE "impersonation_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"impersonator_user_id" varchar NOT NULL,
	"target_user_id" varchar NOT NULL,
	"target_tenant_id" varchar,
	"action" varchar(32) NOT NULL,
	"reason" varchar(64),
	"session_token_prefix" varchar(16),
	"ip_address" varchar(128),
	"user_agent" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"patient_id" varchar NOT NULL,
	"reported_by_id" varchar NOT NULL,
	"location_id" varchar,
	"incident_date" timestamp NOT NULL,
	"reported_to_fap_date" timestamp,
	"incident_location" varchar NOT NULL,
	"job_title" varchar NOT NULL,
	"incident_type" varchar NOT NULL,
	"description" text NOT NULL,
	"severity" varchar NOT NULL,
	"treated_on_site" boolean DEFAULT false,
	"detained_at_fap" boolean DEFAULT false,
	"ambulance_used" boolean DEFAULT false,
	"emergency_medical_mgt" text,
	"disposition_date_time" timestamp,
	"general_condition_at_disposition" varchar,
	"last_menstrual_period" date,
	"reported_to" text,
	"incident_uploads" text,
	"status" varchar DEFAULT 'open',
	"is_drill_or_simulation" boolean DEFAULT false,
	"actions_taken" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "instant_tests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"test_number" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"patient_id" varchar,
	"location_id" varchar,
	"test_type" "instant_test_type" NOT NULL,
	"test_date" date NOT NULL,
	"test_time" varchar,
	"tested_by" varchar NOT NULL,
	"test_result" "instant_test_result",
	"hb_level" varchar,
	"notes" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "instant_tests_tenant_id_test_number_unique" UNIQUE("tenant_id","test_number")
);
--> statement-breakpoint
CREATE TABLE "interop_partners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"referral_facility_id" varchar,
	"name" varchar NOT NULL,
	"fhir_base_url" text,
	"delivery_url" text,
	"delivery_bearer_token" text,
	"inbound_api_key_hash" varchar NOT NULL,
	"inbound_api_key_prefix" varchar(16) NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"allow_inbound_read" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "interop_transfers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"patient_id" varchar NOT NULL,
	"partner_id" varchar,
	"referring_encounter_id" varchar,
	"encounter_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bundle_id" varchar(256) NOT NULL,
	"status" varchar(32) DEFAULT 'prepared' NOT NULL,
	"delivery_method" varchar(32) DEFAULT 'download' NOT NULL,
	"error_message" text,
	"created_by" varchar,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"alert_type" varchar NOT NULL,
	"severity" varchar DEFAULT 'medium',
	"message" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"acknowledged_by" varchar,
	"acknowledged_at" timestamp,
	"resolved_by" varchar,
	"resolved_at" timestamp,
	"current_stock" integer,
	"minimum_stock" integer,
	"expiry_date" date,
	"days_to_expiry" integer,
	"notification_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"company_id" varchar,
	"item_name" varchar NOT NULL,
	"item_code" varchar NOT NULL,
	"category" "inventory_category" NOT NULL,
	"brand" varchar,
	"model" varchar,
	"description" text,
	"unit_of_measure" varchar NOT NULL,
	"dosage_form" varchar,
	"supplier_id" varchar,
	"supplier" varchar,
	"supplier_contact" varchar,
	"image_url" varchar,
	"barcode" varchar,
	"status" "inventory_status" DEFAULT 'active',
	"equipment_status" varchar,
	"last_maintenance_date" date,
	"next_maintenance_date" date,
	"warranty_expiry" date,
	"serial_number" varchar,
	"low_stock_alert" boolean DEFAULT true,
	"expiry_alert" boolean DEFAULT true,
	"expiry_alert_days" integer DEFAULT 30,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "inventory_items_tenant_id_item_code_unique" UNIQUE("tenant_id","item_code")
);
--> statement-breakpoint
CREATE TABLE "inventory_stock" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"location_id" varchar NOT NULL,
	"current_stock" integer DEFAULT 0,
	"minimum_stock" integer DEFAULT 0,
	"maximum_stock" integer DEFAULT 100,
	"reorder_point" integer DEFAULT 10,
	"unit_cost" varchar,
	"total_value" varchar,
	"expiry_date" date,
	"batch_number" varchar,
	"lot_number" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "inventory_stock_tenant_id_item_id_location_id_unique" UNIQUE("tenant_id","item_id","location_id")
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"location_id" varchar,
	"counterparty_location_id" varchar,
	"transaction_type" "transaction_type" NOT NULL,
	"quantity" integer NOT NULL,
	"previous_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"unit_cost" varchar,
	"total_cost" varchar,
	"reference" varchar,
	"reason" varchar,
	"transaction_date" timestamp DEFAULT now(),
	"patient_id" varchar,
	"medical_visit_id" varchar,
	"document_type" varchar,
	"document_id" varchar,
	"notes" text,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"message_id" varchar NOT NULL,
	"file_url" varchar(2048) NOT NULL,
	"original_name" varchar(512) NOT NULL,
	"mime_type" varchar(128),
	"size_bytes" integer,
	"uploaded_by_type" "messaging_participant_type" NOT NULL,
	"uploaded_by_staff_user_id" varchar,
	"uploaded_by_portal_user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"conversation_id" varchar NOT NULL,
	"sender_type" "message_sender_type" NOT NULL,
	"sender_staff_user_id" varchar,
	"sender_portal_user_id" varchar,
	"body_text" text NOT NULL,
	"body_html" text,
	"deleted_at" timestamp,
	"edited_at" timestamp,
	"client_message_id" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging_audit_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"actor_type" "messaging_audit_actor_type" NOT NULL,
	"actor_staff_user_id" varchar,
	"actor_portal_user_id" varchar,
	"action" varchar(64) NOT NULL,
	"conversation_id" varchar,
	"message_id" varchar,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mfa_challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(128) NOT NULL,
	"user_id" varchar NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "mfa_challenges_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "notification_delivery_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"notification_id" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"provider" varchar NOT NULL,
	"status" varchar NOT NULL,
	"error_message" text,
	"provider_response" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar NOT NULL,
	"category" varchar NOT NULL,
	"display_name" varchar NOT NULL,
	"description" text,
	"severity_supported" boolean DEFAULT false,
	"system_defined" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_types_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"recipient_id" varchar NOT NULL,
	"sender_id" varchar,
	"notification_type_id" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"status" "notification_status" DEFAULT 'pending',
	"metadata" jsonb,
	"read_at" timestamp,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "operational_duties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"frequency" varchar NOT NULL,
	"scheduled_time" varchar,
	"scheduled_days" text,
	"is_active" boolean DEFAULT true,
	"priority" varchar DEFAULT 'normal',
	"estimated_duration" integer,
	"category" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "operational_duty_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"duty_id" varchar NOT NULL,
	"assigned_to_id" varchar,
	"location_id" varchar,
	"assignment_date" timestamp NOT NULL,
	"shift" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"completed_at" timestamp,
	"completed_by_id" varchar,
	"started_at" timestamp,
	"notes" text,
	"cancelled_at" timestamp,
	"cancelled_by_id" varchar,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "operational_duty_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"assignment_id" varchar NOT NULL,
	"duty_id" varchar NOT NULL,
	"completed_by_id" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"completion_notes" text,
	"issues_found" boolean DEFAULT false,
	"issue_description" text,
	"follow_up_required" boolean DEFAULT false,
	"attachments" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "patient_follow_ups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"location_id" varchar,
	"patient_id" varchar NOT NULL,
	"employee_id" varchar,
	"medical_visit_id" varchar,
	"care_context" varchar DEFAULT 'onsite' NOT NULL,
	"external_referral_facility_id" varchar,
	"external_referral_facility_other" text,
	"external_diagnosis" text,
	"external_referral_reason" text,
	"external_referral_date" date,
	"external_referral_identifier" varchar,
	"follow_up_type" varchar NOT NULL,
	"reason" text NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_time" varchar,
	"due_by_date" date,
	"priority" varchar DEFAULT 'normal',
	"status" varchar DEFAULT 'scheduled' NOT NULL,
	"completed_at" timestamp,
	"completed_by" varchar,
	"outcome_notes" text,
	"outcome_code" varchar,
	"next_follow_up_date" date,
	"reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" varchar PRIMARY KEY DEFAULT generate_patient_id() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"employee_id" varchar NOT NULL,
	"status" "patient_status" DEFAULT 'active',
	"medical_clearance" boolean DEFAULT true,
	"notes" text,
	"allergies" text,
	"medical_history" text,
	"medications" text,
	"disability" text,
	"first_visit" timestamp DEFAULT now(),
	"last_visit" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portal_access_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"email" varchar(255) NOT NULL,
	"patient_id" varchar,
	"employee_id" varchar,
	"portal_user_id" varchar,
	"request_kind" varchar(32) DEFAULT 'new_access' NOT NULL,
	"match_kind" varchar(32) DEFAULT 'unknown' NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"reviewer_notes" text,
	"reviewed_by_user_id" varchar,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portal_appointment_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"patient_id" varchar NOT NULL,
	"preferred_date" date,
	"preferred_time_window" varchar(120),
	"preferred_modality" "encounter_modality" DEFAULT 'in_person' NOT NULL,
	"preferred_location_id" varchar,
	"reason" text,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"staff_notes" text,
	"linked_appointment_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portal_audit_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"portal_user_id" varchar,
	"patient_id" varchar,
	"action" varchar(64) NOT NULL,
	"details" jsonb,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "portal_magic_login_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_user_id" varchar NOT NULL,
	"token" varchar(128) NOT NULL,
	"expires" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "portal_magic_login_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "portal_notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"portal_user_id" varchar NOT NULL,
	"notification_type" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"metadata_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portal_user_id" varchar NOT NULL,
	"session_token" varchar(128) NOT NULL,
	"expires" timestamp NOT NULL,
	"last_activity_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "portal_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "portal_user_notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"portal_user_id" varchar NOT NULL,
	"preference_key" varchar(64) NOT NULL,
	"channel" varchar(32) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "portal_user_notification_preferences_portal_user_id_preference_key_channel_unique" UNIQUE("portal_user_id","preference_key","channel")
);
--> statement-breakpoint
CREATE TABLE "portal_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"patient_id" varchar NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"last_login_at" timestamp,
	"last_acknowledged_release_version" varchar(32),
	"password_reset_token" varchar(128),
	"password_reset_expires" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "portal_users_tenant_id_email_unique" UNIQUE("tenant_id","email"),
	CONSTRAINT "portal_users_tenant_id_patient_id_unique" UNIQUE("tenant_id","patient_id")
);
--> statement-breakpoint
CREATE TABLE "procedures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"po_id" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"quantity_ordered" integer NOT NULL,
	"quantity_received" integer DEFAULT 0,
	"unit_cost" varchar NOT NULL,
	"total_cost" varchar NOT NULL,
	"item_description" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"po_number" varchar NOT NULL,
	"supplier_id" varchar NOT NULL,
	"order_date" date NOT NULL,
	"expected_delivery" date,
	"actual_delivery" date,
	"total_amount" varchar NOT NULL,
	"status" "purchase_order_status" DEFAULT 'draft',
	"approved_by" varchar,
	"approved_at" timestamp,
	"created_by" varchar NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "purchase_orders_tenant_id_po_number_unique" UNIQUE("tenant_id","po_number")
);
--> statement-breakpoint
CREATE TABLE "random_selections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"pool_id" varchar NOT NULL,
	"selection_date" date NOT NULL,
	"employee_id" varchar NOT NULL,
	"selected_for_testing" boolean DEFAULT true,
	"test_completed" boolean DEFAULT false,
	"drug_test_id" varchar,
	"alcohol_test_id" varchar,
	"hydration_test_id" varchar,
	"selection_method" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "random_testing_pools" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"pool_name" varchar NOT NULL,
	"department" "department",
	"job_classification" varchar,
	"employee_count" integer DEFAULT 0,
	"testing_rate" varchar,
	"last_selection_date" date,
	"next_selection_date" date,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "random_testing_pools_tenant_id_pool_name_unique" UNIQUE("tenant_id","pool_name")
);
--> statement-breakpoint
CREATE TABLE "referral_facilities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"address" text,
	"contact_phone" varchar,
	"contact_email" varchar,
	"status" varchar DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "resource_identifiers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"resource_type" varchar(64) NOT NULL,
	"resource_id" varchar NOT NULL,
	"system" varchar(512) NOT NULL,
	"value" varchar(256) NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "resource_identifiers_tenant_id_system_value_unique" UNIQUE("tenant_id","system","value")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_report_acknowledgments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"shift_report_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"note" text,
	"acknowledged_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shift_report_ack_report_user_unique" UNIQUE("shift_report_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "shift_report_attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"shift_report_id" varchar NOT NULL,
	"file_url" varchar NOT NULL,
	"original_name" varchar NOT NULL,
	"mime_type" varchar,
	"size_bytes" integer,
	"uploaded_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_report_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"shift_report_id" varchar NOT NULL,
	"linked_type" varchar NOT NULL,
	"linked_id" varchar NOT NULL,
	"note" text,
	"created_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shift_report_links_report_target_unique" UNIQUE("shift_report_id","linked_type","linked_id")
);
--> statement-breakpoint
CREATE TABLE "shift_report_revision_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"shift_report_id" varchar NOT NULL,
	"edited_by_user_id" varchar NOT NULL,
	"previous_snapshot" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"location_id" varchar NOT NULL,
	"reported_by_id" varchar NOT NULL,
	"report_date" date NOT NULL,
	"shift" varchar NOT NULL,
	"summary" varchar NOT NULL,
	"notes" text,
	"activities_notes" text,
	"handover_notes" text,
	"has_issues" boolean DEFAULT false,
	"issues_notes" text,
	"handover_structured" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_requisition_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"requisition_id" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"requested_quantity" integer NOT NULL,
	"approved_quantity" integer,
	"unit_of_measure" varchar,
	"unit_cost" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_requisitions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"requesting_location_id" varchar NOT NULL,
	"fulfilling_location_id" varchar NOT NULL,
	"status" varchar DEFAULT 'submitted' NOT NULL,
	"requested_by_id" varchar NOT NULL,
	"approved_by_id" varchar,
	"requested_at" timestamp DEFAULT now(),
	"approved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_transfer_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"transfer_id" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"quantity_planned" integer NOT NULL,
	"quantity_dispatched" integer,
	"quantity_received" integer,
	"unit_of_measure" varchar,
	"unit_cost" varchar,
	"batch_number" varchar,
	"expiry_date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"from_location_id" varchar NOT NULL,
	"to_location_id" varchar NOT NULL,
	"type" varchar DEFAULT 'normal' NOT NULL,
	"status" varchar DEFAULT 'pending_dispatch' NOT NULL,
	"requisition_id" varchar,
	"dispatched_by_id" varchar,
	"dispatched_at" timestamp,
	"received_by_id" varchar,
	"received_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"contact_name" varchar,
	"email" varchar,
	"phone" varchar,
	"address" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "telecare_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"patient_id" varchar NOT NULL,
	"provider_id" varchar NOT NULL,
	"appointment_id" varchar,
	"scheduled_start" timestamp NOT NULL,
	"scheduled_end" timestamp,
	"actual_start" timestamp,
	"actual_end" timestamp,
	"status" varchar(32) DEFAULT 'scheduled' NOT NULL,
	"video_provider" varchar(32) DEFAULT 'livekit',
	"room_id" varchar(256),
	"join_url_patient" text,
	"join_url_provider" text,
	"recording_consent" boolean DEFAULT false,
	"patient_telehealth_consent_at" timestamp,
	"recording_url" text,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_portal_settings" (
	"tenant_id" varchar PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"support_email" varchar,
	"privacy_policy_url" text,
	"features_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_security_settings" (
	"tenant_id" varchar PRIMARY KEY NOT NULL,
	"staff_session_absolute_hours" integer DEFAULT 12 NOT NULL,
	"staff_session_idle_minutes" integer DEFAULT 30 NOT NULL,
	"portal_session_absolute_days" integer DEFAULT 14 NOT NULL,
	"portal_session_idle_minutes" integer DEFAULT 60 NOT NULL,
	"portal_session_sliding_days" integer DEFAULT 7 NOT NULL,
	"session_warning_lead_minutes" integer DEFAULT 3 NOT NULL,
	"require_mfa" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_signed_legal_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"document_type" varchar(64) NOT NULL,
	"storage_url" text NOT NULL,
	"original_filename" varchar(512) NOT NULL,
	"mime_type" varchar(128),
	"file_size_bytes" integer,
	"uploaded_by_user_id" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tenant_sop_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"title" varchar(512) NOT NULL,
	"code" varchar(64),
	"department" varchar(128),
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by_user_id" varchar
);
--> statement-breakpoint
CREATE TABLE "tenant_sop_versions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"version_number" integer NOT NULL,
	"status" "tenant_sop_version_status" DEFAULT 'draft' NOT NULL,
	"content_html" text DEFAULT '' NOT NULL,
	"attachment_url" varchar(2048),
	"attachment_filename" varchar(512),
	"attachment_mime" varchar(128),
	"change_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by_user_id" varchar,
	"submitted_at" timestamp,
	"approved_at" timestamp,
	"approved_by_user_id" varchar,
	"rejected_at" timestamp,
	"rejected_by_user_id" varchar,
	"rejection_reason" text,
	CONSTRAINT "uq_tenant_sop_versions_doc_ver" UNIQUE("document_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"organization_type" varchar DEFAULT 'mining_site' NOT NULL,
	"contact_email" varchar NOT NULL,
	"contact_phone" varchar,
	"address" text,
	"plan_type" varchar DEFAULT 'basic' NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"max_users" integer DEFAULT 50,
	"max_companies" integer DEFAULT 10,
	"has_multiple_locations" boolean DEFAULT false,
	"currency_code" varchar DEFAULT 'GHS',
	"app_name" varchar,
	"logo_url" text,
	"primary_color" varchar,
	"favicon_url" text,
	"portal_slug" varchar(80),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "testing_equipment" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"device_name" varchar NOT NULL,
	"device_type" "testing_device" NOT NULL,
	"model" varchar,
	"serial_number" varchar,
	"manufacturer" varchar,
	"last_calibration_date" date,
	"next_calibration_date" date,
	"calibration_certificate" varchar,
	"status" "inventory_status" DEFAULT 'active',
	"location" varchar,
	"supported_tests" text,
	"test_accuracy" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "testing_programs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"program_name" varchar NOT NULL,
	"program_type" "testing_program_type" NOT NULL,
	"testing_frequency" varchar,
	"pool_size" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"required_tests" text,
	"departments" text,
	"job_classifications" text,
	"ug_personnel_focused" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "testing_programs_tenant_id_program_name_unique" UNIQUE("tenant_id","program_name")
);
--> statement-breakpoint
CREATE TABLE "ticket_activity" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"ticket_id" varchar NOT NULL,
	"actor_user_id" varchar NOT NULL,
	"action" varchar(64) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_attachments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"ticket_id" varchar NOT NULL,
	"file_url" varchar NOT NULL,
	"original_name" varchar NOT NULL,
	"mime_type" varchar,
	"size_bytes" integer,
	"uploaded_by_user_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"name" varchar NOT NULL,
	"slug" varchar NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_categories_tenant_slug_unique" UNIQUE("tenant_id","slug")
);
--> statement-breakpoint
CREATE TABLE "ticket_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"ticket_id" varchar NOT NULL,
	"author_user_id" varchar NOT NULL,
	"body_html" text DEFAULT '' NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_number_sequences" (
	"tenant_id" varchar NOT NULL,
	"year" integer NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ticket_number_sequences_tenant_id_year_pk" PRIMARY KEY("tenant_id","year")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"ticket_number" varchar NOT NULL,
	"category_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description_html" text DEFAULT '' NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'normal' NOT NULL,
	"requester_user_id" varchar NOT NULL,
	"assignee_user_id" varchar,
	"location_id" varchar,
	"related_incident_id" varchar,
	"asset_tag" varchar(255),
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" varchar NOT NULL,
	"updated_by" varchar,
	CONSTRAINT "tickets_tenant_ticket_number_unique" UNIQUE("tenant_id","ticket_number")
);
--> statement-breakpoint
CREATE TABLE "triage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"patient_id" varchar NOT NULL,
	"location_id" varchar,
	"recorded_by" varchar NOT NULL,
	"triage_at" timestamp NOT NULL,
	"vital_signs_id" varchar,
	"encounter_id" varchar,
	"medical_visit_id" varchar,
	"acuity" varchar NOT NULL,
	"tews_score" integer NOT NULL,
	"clinical_discriminators" text NOT NULL,
	"presenting_complaint" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"notification_type_id" varchar NOT NULL,
	"channel" varchar NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"min_severity" varchar,
	"admin_managed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_notification_preferences_tenant_id_user_id_notification_type_id_channel_unique" UNIQUE("tenant_id","user_id","notification_type_id","channel")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_token" varchar NOT NULL,
	"expires" timestamp NOT NULL,
	"last_activity_at" timestamp DEFAULT now(),
	"active_location_id" varchar,
	"active_location_name" varchar,
	"impersonator_user_id" varchar,
	"impersonation_started_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"phone_number" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"bio" text,
	"password" varchar,
	"oauth_issuer" varchar(512),
	"oauth_sub" varchar(255),
	"auth_provider" varchar DEFAULT 'custom' NOT NULL,
	"is_email_verified" boolean DEFAULT false,
	"is_phone_verified" boolean DEFAULT false,
	"tenant_id" varchar,
	"employee_id" varchar,
	"role" "user_role" DEFAULT 'medical_staff',
	"status" "user_status" DEFAULT 'pending',
	"last_login_at" timestamp,
	"password_reset_token" varchar,
	"password_reset_expires" timestamp,
	"email_verification_token" varchar,
	"phone_verification_code" varchar,
	"phone_verification_expires" timestamp,
	"approved_by" varchar,
	"approved_at" timestamp,
	"totp_secret_enc" text,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"mfa_backup_codes" jsonb,
	"last_acknowledged_release_version" varchar(32),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vital_signs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" varchar NOT NULL,
	"patient_id" varchar NOT NULL,
	"location_id" varchar,
	"recorded_by" varchar,
	"portal_user_id" varchar,
	"source" varchar DEFAULT 'clinic' NOT NULL,
	"recorded_at" timestamp NOT NULL,
	"encounter_id" varchar,
	"medical_visit_id" varchar,
	"triage_id" varchar,
	"blood_pressure_systolic" integer,
	"blood_pressure_diastolic" integer,
	"heart_rate" integer,
	"temperature" varchar,
	"respiratory_rate" integer,
	"oxygen_saturation" integer,
	"glucose_level" real,
	"glucose_context" varchar,
	"pain_score" integer,
	"weight" varchar,
	"height" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "alcohol_tests" ADD CONSTRAINT "alcohol_tests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alcohol_tests" ADD CONSTRAINT "alcohol_tests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alcohol_tests" ADD CONSTRAINT "alcohol_tests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alcohol_tests" ADD CONSTRAINT "alcohol_tests_program_id_testing_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."testing_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alcohol_tests" ADD CONSTRAINT "alcohol_tests_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alcohol_tests" ADD CONSTRAINT "alcohol_tests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alcohol_tests" ADD CONSTRAINT "alcohol_tests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambulance_prestart_checks" ADD CONSTRAINT "ambulance_prestart_checks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambulance_prestart_checks" ADD CONSTRAINT "ambulance_prestart_checks_ambulance_location_id_care_locations_id_fk" FOREIGN KEY ("ambulance_location_id") REFERENCES "public"."care_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ambulance_prestart_checks" ADD CONSTRAINT "ambulance_prestart_checks_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_medical_staff_id_users_id_fk" FOREIGN KEY ("medical_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_telecare_session_id_telecare_sessions_id_fk" FOREIGN KEY ("telecare_session_id") REFERENCES "public"."telecare_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_locations" ADD CONSTRAINT "care_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_locations" ADD CONSTRAINT "care_locations_stationed_at_location_id_care_locations_id_fk" FOREIGN KEY ("stationed_at_location_id") REFERENCES "public"."care_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_staff_user_id_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_portal_user_id_portal_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_staff_user_id_users_id_fk" FOREIGN KEY ("assigned_staff_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_staff_user_id_users_id_fk" FOREIGN KEY ("created_by_staff_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_portal_user_id_portal_users_id_fk" FOREIGN KEY ("created_by_portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_tests" ADD CONSTRAINT "drug_tests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_tests" ADD CONSTRAINT "drug_tests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_tests" ADD CONSTRAINT "drug_tests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_tests" ADD CONSTRAINT "drug_tests_program_id_testing_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."testing_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_tests" ADD CONSTRAINT "drug_tests_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_tests" ADD CONSTRAINT "drug_tests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_tests" ADD CONSTRAINT "drug_tests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_feedback" ADD CONSTRAINT "employee_feedback_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_feedback" ADD CONSTRAINT "employee_feedback_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_feedback" ADD CONSTRAINT "employee_feedback_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_feedback" ADD CONSTRAINT "employee_feedback_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_feedback" ADD CONSTRAINT "employee_feedback_medical_visit_id_encounters_id_fk" FOREIGN KEY ("medical_visit_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_feedback" ADD CONSTRAINT "employee_feedback_survey_id_employee_feedback_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."employee_feedback_surveys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_feedback" ADD CONSTRAINT "employee_feedback_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_feedback_surveys" ADD CONSTRAINT "employee_feedback_surveys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_fitness_cases" ADD CONSTRAINT "employee_work_fitness_cases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_fitness_cases" ADD CONSTRAINT "employee_work_fitness_cases_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_fitness_cases" ADD CONSTRAINT "employee_work_fitness_cases_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_fitness_cases" ADD CONSTRAINT "employee_work_fitness_cases_related_medical_visit_id_encounters_id_fk" FOREIGN KEY ("related_medical_visit_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_fitness_cases" ADD CONSTRAINT "employee_work_fitness_cases_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_fitness_cases" ADD CONSTRAINT "employee_work_fitness_cases_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_fitness_cases" ADD CONSTRAINT "employee_work_fitness_cases_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_fitness_medications" ADD CONSTRAINT "employee_work_fitness_medications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_work_fitness_medications" ADD CONSTRAINT "employee_work_fitness_medications_case_id_employee_work_fitness_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."employee_work_fitness_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_medical_staff_id_users_id_fk" FOREIGN KEY ("medical_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_telecare_session_id_telecare_sessions_id_fk" FOREIGN KEY ("telecare_session_id") REFERENCES "public"."telecare_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_transfer_facility_id_referral_facilities_id_fk" FOREIGN KEY ("transfer_facility_id") REFERENCES "public"."referral_facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_triage_id_triage_id_fk" FOREIGN KEY ("triage_id") REFERENCES "public"."triage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_maintenance" ADD CONSTRAINT "equipment_maintenance_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_maintenance" ADD CONSTRAINT "equipment_maintenance_equipment_id_inventory_stock_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."inventory_stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_maintenance" ADD CONSTRAINT "equipment_maintenance_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_maintenance" ADD CONSTRAINT "equipment_maintenance_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hydration_tests" ADD CONSTRAINT "hydration_tests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hydration_tests" ADD CONSTRAINT "hydration_tests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hydration_tests" ADD CONSTRAINT "hydration_tests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hydration_tests" ADD CONSTRAINT "hydration_tests_program_id_testing_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."testing_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hydration_tests" ADD CONSTRAINT "hydration_tests_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hydration_tests" ADD CONSTRAINT "hydration_tests_tested_by_users_id_fk" FOREIGN KEY ("tested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hydration_tests" ADD CONSTRAINT "hydration_tests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_events" ADD CONSTRAINT "impersonation_events_impersonator_user_id_users_id_fk" FOREIGN KEY ("impersonator_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_events" ADD CONSTRAINT "impersonation_events_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impersonation_events" ADD CONSTRAINT "impersonation_events_target_tenant_id_tenants_id_fk" FOREIGN KEY ("target_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_reports" ADD CONSTRAINT "incident_reports_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instant_tests" ADD CONSTRAINT "instant_tests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instant_tests" ADD CONSTRAINT "instant_tests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instant_tests" ADD CONSTRAINT "instant_tests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instant_tests" ADD CONSTRAINT "instant_tests_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instant_tests" ADD CONSTRAINT "instant_tests_tested_by_users_id_fk" FOREIGN KEY ("tested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instant_tests" ADD CONSTRAINT "instant_tests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interop_partners" ADD CONSTRAINT "interop_partners_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interop_partners" ADD CONSTRAINT "interop_partners_referral_facility_id_referral_facilities_id_fk" FOREIGN KEY ("referral_facility_id") REFERENCES "public"."referral_facilities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interop_transfers" ADD CONSTRAINT "interop_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interop_transfers" ADD CONSTRAINT "interop_transfers_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interop_transfers" ADD CONSTRAINT "interop_transfers_partner_id_interop_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."interop_partners"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interop_transfers" ADD CONSTRAINT "interop_transfers_referring_encounter_id_encounters_id_fk" FOREIGN KEY ("referring_encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interop_transfers" ADD CONSTRAINT "interop_transfers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_item_id_inventory_stock_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_alerts" ADD CONSTRAINT "inventory_alerts_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_item_id_inventory_stock_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_counterparty_location_id_care_locations_id_fk" FOREIGN KEY ("counterparty_location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_medical_visit_id_encounters_id_fk" FOREIGN KEY ("medical_visit_id") REFERENCES "public"."encounters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_uploaded_by_staff_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_staff_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_uploaded_by_portal_user_id_portal_users_id_fk" FOREIGN KEY ("uploaded_by_portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_staff_user_id_users_id_fk" FOREIGN KEY ("sender_staff_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_portal_user_id_portal_users_id_fk" FOREIGN KEY ("sender_portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_audit_log" ADD CONSTRAINT "messaging_audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_audit_log" ADD CONSTRAINT "messaging_audit_log_actor_staff_user_id_users_id_fk" FOREIGN KEY ("actor_staff_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_audit_log" ADD CONSTRAINT "messaging_audit_log_actor_portal_user_id_portal_users_id_fk" FOREIGN KEY ("actor_portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_audit_log" ADD CONSTRAINT "messaging_audit_log_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messaging_audit_log" ADD CONSTRAINT "messaging_audit_log_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfa_challenges" ADD CONSTRAINT "mfa_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery_logs" ADD CONSTRAINT "notification_delivery_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery_logs" ADD CONSTRAINT "notification_delivery_logs_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_notification_type_id_notification_types_id_fk" FOREIGN KEY ("notification_type_id") REFERENCES "public"."notification_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_duties" ADD CONSTRAINT "operational_duties_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_duty_assignments" ADD CONSTRAINT "operational_duty_assignments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_duty_assignments" ADD CONSTRAINT "operational_duty_assignments_duty_id_operational_duties_id_fk" FOREIGN KEY ("duty_id") REFERENCES "public"."operational_duties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_duty_assignments" ADD CONSTRAINT "operational_duty_assignments_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_duty_assignments" ADD CONSTRAINT "operational_duty_assignments_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_duty_assignments" ADD CONSTRAINT "operational_duty_assignments_completed_by_id_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_duty_assignments" ADD CONSTRAINT "operational_duty_assignments_cancelled_by_id_users_id_fk" FOREIGN KEY ("cancelled_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_duty_completions" ADD CONSTRAINT "operational_duty_completions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_duty_completions" ADD CONSTRAINT "operational_duty_completions_assignment_id_operational_duty_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."operational_duty_assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_duty_completions" ADD CONSTRAINT "operational_duty_completions_duty_id_operational_duties_id_fk" FOREIGN KEY ("duty_id") REFERENCES "public"."operational_duties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_duty_completions" ADD CONSTRAINT "operational_duty_completions_completed_by_id_users_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_medical_visit_id_encounters_id_fk" FOREIGN KEY ("medical_visit_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_external_referral_facility_id_referral_facilities_id_fk" FOREIGN KEY ("external_referral_facility_id") REFERENCES "public"."referral_facilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_follow_ups" ADD CONSTRAINT "patient_follow_ups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_access_requests" ADD CONSTRAINT "portal_access_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_access_requests" ADD CONSTRAINT "portal_access_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_access_requests" ADD CONSTRAINT "portal_access_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_access_requests" ADD CONSTRAINT "portal_access_requests_portal_user_id_portal_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_access_requests" ADD CONSTRAINT "portal_access_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_appointment_requests" ADD CONSTRAINT "portal_appointment_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_appointment_requests" ADD CONSTRAINT "portal_appointment_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_appointment_requests" ADD CONSTRAINT "portal_appointment_requests_preferred_location_id_care_locations_id_fk" FOREIGN KEY ("preferred_location_id") REFERENCES "public"."care_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_appointment_requests" ADD CONSTRAINT "portal_appointment_requests_linked_appointment_id_appointments_id_fk" FOREIGN KEY ("linked_appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_audit_events" ADD CONSTRAINT "portal_audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_audit_events" ADD CONSTRAINT "portal_audit_events_portal_user_id_portal_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_audit_events" ADD CONSTRAINT "portal_audit_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_magic_login_tokens" ADD CONSTRAINT "portal_magic_login_tokens_portal_user_id_portal_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_notifications" ADD CONSTRAINT "portal_notifications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_notifications" ADD CONSTRAINT "portal_notifications_portal_user_id_portal_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_sessions" ADD CONSTRAINT "portal_sessions_portal_user_id_portal_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_user_notification_preferences" ADD CONSTRAINT "portal_user_notification_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_user_notification_preferences" ADD CONSTRAINT "portal_user_notification_preferences_portal_user_id_portal_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_users" ADD CONSTRAINT "portal_users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_users" ADD CONSTRAINT "portal_users_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_id_purchase_orders_id_fk" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "random_selections" ADD CONSTRAINT "random_selections_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "random_selections" ADD CONSTRAINT "random_selections_pool_id_random_testing_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."random_testing_pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "random_selections" ADD CONSTRAINT "random_selections_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "random_selections" ADD CONSTRAINT "random_selections_drug_test_id_drug_tests_id_fk" FOREIGN KEY ("drug_test_id") REFERENCES "public"."drug_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "random_selections" ADD CONSTRAINT "random_selections_alcohol_test_id_alcohol_tests_id_fk" FOREIGN KEY ("alcohol_test_id") REFERENCES "public"."alcohol_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "random_selections" ADD CONSTRAINT "random_selections_hydration_test_id_hydration_tests_id_fk" FOREIGN KEY ("hydration_test_id") REFERENCES "public"."hydration_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "random_testing_pools" ADD CONSTRAINT "random_testing_pools_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_facilities" ADD CONSTRAINT "referral_facilities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_identifiers" ADD CONSTRAINT "resource_identifiers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_acknowledgments" ADD CONSTRAINT "shift_report_acknowledgments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_acknowledgments" ADD CONSTRAINT "shift_report_acknowledgments_shift_report_id_shift_reports_id_fk" FOREIGN KEY ("shift_report_id") REFERENCES "public"."shift_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_acknowledgments" ADD CONSTRAINT "shift_report_acknowledgments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_attachments" ADD CONSTRAINT "shift_report_attachments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_attachments" ADD CONSTRAINT "shift_report_attachments_shift_report_id_shift_reports_id_fk" FOREIGN KEY ("shift_report_id") REFERENCES "public"."shift_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_attachments" ADD CONSTRAINT "shift_report_attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_links" ADD CONSTRAINT "shift_report_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_links" ADD CONSTRAINT "shift_report_links_shift_report_id_shift_reports_id_fk" FOREIGN KEY ("shift_report_id") REFERENCES "public"."shift_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_links" ADD CONSTRAINT "shift_report_links_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_revision_history" ADD CONSTRAINT "shift_report_revision_history_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_revision_history" ADD CONSTRAINT "shift_report_revision_history_shift_report_id_shift_reports_id_fk" FOREIGN KEY ("shift_report_id") REFERENCES "public"."shift_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_report_revision_history" ADD CONSTRAINT "shift_report_revision_history_edited_by_user_id_users_id_fk" FOREIGN KEY ("edited_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_reported_by_id_users_id_fk" FOREIGN KEY ("reported_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requisition_items" ADD CONSTRAINT "stock_requisition_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requisition_items" ADD CONSTRAINT "stock_requisition_items_requisition_id_stock_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."stock_requisitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requisition_items" ADD CONSTRAINT "stock_requisition_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requisitions" ADD CONSTRAINT "stock_requisitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requisitions" ADD CONSTRAINT "stock_requisitions_requesting_location_id_care_locations_id_fk" FOREIGN KEY ("requesting_location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requisitions" ADD CONSTRAINT "stock_requisitions_fulfilling_location_id_care_locations_id_fk" FOREIGN KEY ("fulfilling_location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requisitions" ADD CONSTRAINT "stock_requisitions_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_requisitions" ADD CONSTRAINT "stock_requisitions_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_location_id_care_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_location_id_care_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_requisition_id_stock_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."stock_requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_dispatched_by_id_users_id_fk" FOREIGN KEY ("dispatched_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_received_by_id_users_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telecare_sessions" ADD CONSTRAINT "telecare_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telecare_sessions" ADD CONSTRAINT "telecare_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telecare_sessions" ADD CONSTRAINT "telecare_sessions_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telecare_sessions" ADD CONSTRAINT "telecare_sessions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_portal_settings" ADD CONSTRAINT "tenant_portal_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_security_settings" ADD CONSTRAINT "tenant_security_settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_signed_legal_documents" ADD CONSTRAINT "tenant_signed_legal_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_signed_legal_documents" ADD CONSTRAINT "tenant_signed_legal_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_sop_documents" ADD CONSTRAINT "tenant_sop_documents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_sop_documents" ADD CONSTRAINT "tenant_sop_documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_sop_versions" ADD CONSTRAINT "tenant_sop_versions_document_id_tenant_sop_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."tenant_sop_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_sop_versions" ADD CONSTRAINT "tenant_sop_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_sop_versions" ADD CONSTRAINT "tenant_sop_versions_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_sop_versions" ADD CONSTRAINT "tenant_sop_versions_rejected_by_user_id_users_id_fk" FOREIGN KEY ("rejected_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testing_equipment" ADD CONSTRAINT "testing_equipment_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "testing_programs" ADD CONSTRAINT "testing_programs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_activity" ADD CONSTRAINT "ticket_activity_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_activity" ADD CONSTRAINT "ticket_activity_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_activity" ADD CONSTRAINT "ticket_activity_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_categories" ADD CONSTRAINT "ticket_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_number_sequences" ADD CONSTRAINT "ticket_number_sequences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_category_id_ticket_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_related_incident_id_incident_reports_id_fk" FOREIGN KEY ("related_incident_id") REFERENCES "public"."incident_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage" ADD CONSTRAINT "triage_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage" ADD CONSTRAINT "triage_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage" ADD CONSTRAINT "triage_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage" ADD CONSTRAINT "triage_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage" ADD CONSTRAINT "triage_vital_signs_id_vital_signs_id_fk" FOREIGN KEY ("vital_signs_id") REFERENCES "public"."vital_signs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage" ADD CONSTRAINT "triage_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "triage" ADD CONSTRAINT "triage_medical_visit_id_encounters_id_fk" FOREIGN KEY ("medical_visit_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_notification_type_id_notification_types_id_fk" FOREIGN KEY ("notification_type_id") REFERENCES "public"."notification_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_impersonator_user_id_users_id_fk" FOREIGN KEY ("impersonator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_location_id_care_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."care_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_portal_user_id_portal_users_id_fk" FOREIGN KEY ("portal_user_id") REFERENCES "public"."portal_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_medical_visit_id_encounters_id_fk" FOREIGN KEY ("medical_visit_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_triage_id_triage_id_fk" FOREIGN KEY ("triage_id") REFERENCES "public"."triage"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ambulance_prestart_tenant_ambulance_idx" ON "ambulance_prestart_checks" USING btree ("tenant_id","ambulance_location_id");--> statement-breakpoint
CREATE INDEX "ambulance_prestart_tenant_shift_idx" ON "ambulance_prestart_checks" USING btree ("tenant_id","shift_date");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_tenant_created_at" ON "audit_logs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "care_locations_tenant_kind_idx" ON "care_locations" USING btree ("tenant_id","location_kind");--> statement-breakpoint
CREATE INDEX "idx_conversation_participants_conversation" ON "conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_tenant_last_message" ON "conversations" USING btree ("tenant_id","last_message_at");--> statement-breakpoint
CREATE INDEX "idx_conversations_tenant_patient" ON "conversations" USING btree ("tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_tenant_status" ON "conversations" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_emp_feedback_tenant" ON "employee_feedback" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_emp_feedback_location" ON "employee_feedback" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_emp_feedback_date" ON "employee_feedback" USING btree ("tenant_id","feedback_date");--> statement-breakpoint
CREATE INDEX "idx_emp_feedback_type" ON "employee_feedback" USING btree ("tenant_id","feedback_type");--> statement-breakpoint
CREATE INDEX "idx_emp_feedback_status" ON "employee_feedback" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_emp_feedback_surveys_tenant" ON "employee_feedback_surveys" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_emp_feedback_surveys_active" ON "employee_feedback_surveys" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_wf_cases_tenant" ON "employee_work_fitness_cases" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_wf_cases_employee" ON "employee_work_fitness_cases" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "idx_wf_cases_status" ON "employee_work_fitness_cases" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_wf_cases_submitted" ON "employee_work_fitness_cases" USING btree ("tenant_id","submitted_at");--> statement-breakpoint
CREATE INDEX "idx_wf_cases_outcome" ON "employee_work_fitness_cases" USING btree ("tenant_id","fitness_outcome");--> statement-breakpoint
CREATE INDEX "idx_wf_meds_case" ON "employee_work_fitness_medications" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "idx_wf_meds_tenant" ON "employee_work_fitness_medications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_encounters_tenant_patient" ON "encounters" USING btree ("tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_encounters_tenant_visit_date" ON "encounters" USING btree ("tenant_id","visit_date");--> statement-breakpoint
CREATE INDEX "idx_encounters_pathway" ON "encounters" USING btree ("tenant_id","pathway");--> statement-breakpoint
CREATE INDEX "idx_encounters_modality" ON "encounters" USING btree ("tenant_id","modality");--> statement-breakpoint
CREATE INDEX "idx_feedback_status" ON "feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_feedback_path" ON "feedback" USING btree ("path");--> statement-breakpoint
CREATE INDEX "idx_feedback_created_at" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_interop_partners_tenant" ON "interop_partners" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_interop_partners_prefix" ON "interop_partners" USING btree ("inbound_api_key_prefix");--> statement-breakpoint
CREATE INDEX "idx_interop_transfers_tenant_patient" ON "interop_transfers" USING btree ("tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_interop_transfers_status" ON "interop_transfers" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_message_attachments_message" ON "message_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation_created" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messaging_audit_tenant_created" ON "messaging_audit_log" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messaging_audit_conversation" ON "messaging_audit_log" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_mfa_challenges_user" ON "mfa_challenges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_mfa_challenges_expires" ON "mfa_challenges" USING btree ("expires");--> statement-breakpoint
CREATE INDEX "idx_ndl_notification" ON "notification_delivery_logs" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_ndl_status" ON "notification_delivery_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ndl_channel" ON "notification_delivery_logs" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_ndl_tenant" ON "notification_delivery_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_notification_types_key" ON "notification_types" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_notification_types_category" ON "notification_types" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_notifications_tenant" ON "notifications" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient" ON "notifications" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_type" ON "notifications" USING btree ("notification_type_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_status" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notifications_channel" ON "notifications" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_tenant" ON "patient_follow_ups" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_location" ON "patient_follow_ups" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_patient" ON "patient_follow_ups" USING btree ("tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_scheduled" ON "patient_follow_ups" USING btree ("tenant_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_status" ON "patient_follow_ups" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_follow_ups_care_context" ON "patient_follow_ups" USING btree ("tenant_id","care_context");--> statement-breakpoint
CREATE INDEX "idx_portal_access_requests_tenant_status" ON "portal_access_requests" USING btree ("tenant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "idx_portal_appt_req_patient" ON "portal_appointment_requests" USING btree ("tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_portal_audit_tenant" ON "portal_audit_events" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_portal_magic_tokens_user" ON "portal_magic_login_tokens" USING btree ("portal_user_id");--> statement-breakpoint
CREATE INDEX "idx_portal_magic_tokens_expires" ON "portal_magic_login_tokens" USING btree ("expires");--> statement-breakpoint
CREATE INDEX "idx_portal_notifications_user_unread" ON "portal_notifications" USING btree ("portal_user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "idx_portal_notifications_tenant" ON "portal_notifications" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_portal_sessions_user" ON "portal_sessions" USING btree ("portal_user_id");--> statement-breakpoint
CREATE INDEX "idx_portal_sessions_expires" ON "portal_sessions" USING btree ("expires");--> statement-breakpoint
CREATE INDEX "idx_portal_unp_user" ON "portal_user_notification_preferences" USING btree ("portal_user_id");--> statement-breakpoint
CREATE INDEX "idx_portal_unp_tenant" ON "portal_user_notification_preferences" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_resource_identifiers_tenant_resource" ON "resource_identifiers" USING btree ("tenant_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_shift_report_ack_tenant" ON "shift_report_acknowledgments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_shift_report_ack_report" ON "shift_report_acknowledgments" USING btree ("shift_report_id");--> statement-breakpoint
CREATE INDEX "idx_shift_report_attachments_report" ON "shift_report_attachments" USING btree ("shift_report_id");--> statement-breakpoint
CREATE INDEX "idx_shift_report_links_tenant" ON "shift_report_links" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_shift_report_links_report" ON "shift_report_links" USING btree ("shift_report_id");--> statement-breakpoint
CREATE INDEX "idx_shift_report_links_target" ON "shift_report_links" USING btree ("linked_type","linked_id");--> statement-breakpoint
CREATE INDEX "idx_shift_report_revision_report" ON "shift_report_revision_history" USING btree ("shift_report_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_shift_reports_tenant_date" ON "shift_reports" USING btree ("tenant_id","report_date");--> statement-breakpoint
CREATE INDEX "idx_shift_reports_location_date" ON "shift_reports" USING btree ("location_id","report_date");--> statement-breakpoint
CREATE INDEX "idx_telecare_sessions_tenant_patient" ON "telecare_sessions" USING btree ("tenant_id","patient_id");--> statement-breakpoint
CREATE INDEX "idx_telecare_sessions_tenant_status" ON "telecare_sessions" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "idx_telecare_sessions_appointment" ON "telecare_sessions" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_signed_legal_tenant" ON "tenant_signed_legal_documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_signed_legal_tenant_created" ON "tenant_signed_legal_documents" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_tenant_sop_documents_tenant" ON "tenant_sop_documents" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_sop_documents_tenant_archived" ON "tenant_sop_documents" USING btree ("tenant_id","is_archived");--> statement-breakpoint
CREATE INDEX "idx_tenant_sop_versions_document" ON "tenant_sop_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_sop_versions_status" ON "tenant_sop_versions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ticket_activity_ticket" ON "ticket_activity" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_ticket_attachments_ticket" ON "ticket_attachments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_categories_tenant" ON "ticket_categories" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_comments_ticket" ON "ticket_comments" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_tickets_tenant_status_updated" ON "tickets" USING btree ("tenant_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_tickets_tenant_requester" ON "tickets" USING btree ("tenant_id","requester_user_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_tenant_assignee" ON "tickets" USING btree ("tenant_id","assignee_user_id");--> statement-breakpoint
CREATE INDEX "idx_triage_tenant_patient_at" ON "triage" USING btree ("tenant_id","patient_id","triage_at");--> statement-breakpoint
CREATE INDEX "idx_triage_tenant_acuity" ON "triage" USING btree ("tenant_id","acuity");--> statement-breakpoint
CREATE INDEX "idx_triage_tenant_visit" ON "triage" USING btree ("tenant_id","medical_visit_id");--> statement-breakpoint
CREATE INDEX "idx_triage_encounter" ON "triage" USING btree ("tenant_id","encounter_id");--> statement-breakpoint
CREATE INDEX "idx_unp_tenant" ON "user_notification_preferences" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_unp_user" ON "user_notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_unp_notification_type" ON "user_notification_preferences" USING btree ("notification_type_id");--> statement-breakpoint
CREATE INDEX "idx_unp_channel" ON "user_notification_preferences" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_unp_tenant_type_enabled" ON "user_notification_preferences" USING btree ("tenant_id","notification_type_id","enabled");--> statement-breakpoint
CREATE INDEX "idx_vital_signs_tenant_patient_at" ON "vital_signs" USING btree ("tenant_id","patient_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_vital_signs_tenant_visit" ON "vital_signs" USING btree ("tenant_id","medical_visit_id");--> statement-breakpoint
CREATE INDEX "idx_vital_signs_tenant_triage" ON "vital_signs" USING btree ("tenant_id","triage_id");--> statement-breakpoint
CREATE INDEX "idx_vital_signs_encounter" ON "vital_signs" USING btree ("tenant_id","encounter_id");--> statement-breakpoint
CREATE INDEX "idx_vital_signs_source" ON "vital_signs" USING btree ("tenant_id","source");