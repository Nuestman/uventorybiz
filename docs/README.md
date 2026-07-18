# MineAid HMS - Documentation

## Overview
Welcome to the MineAid Healthcare Management System documentation. This comprehensive system provides advanced healthcare management for mining operations with multi-tenant architecture and complete data isolation.

**Package version**: 4.35.2 (see repository root `package.json`)
**Last release (changelog)**: 4.35.2 — July 14, 2026
**Status**: Production ready — schema via [DRIZZLE_MIGRATIONS.md](DRIZZLE_MIGRATIONS.md); seeds via `npm run db:seed`
**Last documentation review**: July 6, 2026

## Documentation Structure

### 📋 Project Information
- **[CHANGELOG.md](CHANGELOG.md)** - Complete version history; also powers the in-app **Changelog** page (`/changelog`, `GET /api/changelog`)
- **[VERSION.md](VERSION.md)** - Current version information and feature completeness tracking
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** - Detailed implementation status and feature progress

### 📖 Technical Documentation
- **[RBAC.md](RBAC.md)** - Consolidated role-based access control: roles, PHI/clinical APIs, Employee wellbeing, admin/super-admin, client guards
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete API endpoint documentation
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - Original implementation plan and architecture decisions
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Production deployment instructions and requirements
- **[LOCAL_DEVELOPMENT_SETUP.md](LOCAL_DEVELOPMENT_SETUP.md)** - Local development environment setup
- **[DRIZZLE_MIGRATIONS.md](DRIZZLE_MIGRATIONS.md)** - Drizzle journal, fresh DB policy, seeds (`db:seed`), legacy archive
- **[MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)** - Historical Neon / legacy SQL upgrade paths
- **[OFFLINE_MODE_AND_SYNC.md](OFFLINE_MODE_AND_SYNC.md)** - Offline-first architecture and sync design for underground/field use
- **[SUPER_ADMIN_SYSTEM_CONSOLE.md](SUPER_ADMIN_SYSTEM_CONSOLE.md)** - Super Admin **System** menu: system status, security hub, global audit, integrations flags, billing/plan overview (routes `/super-admin/system-status`, `/security`, `/audit`, `/integrations`, `/billing`; impersonation log references [IMPERSONATION.md](IMPERSONATION.md))
- **[IMPERSONATION.md](IMPERSONATION.md)** - Super-admin **support impersonation**: session rules, audit, migrations **`20260404_super_admin_impersonation.sql`**, API summary (**4.18.0**)
- **[OIDC_LOGIN_PLAN.md](OIDC_LOGIN_PLAN.md)** - **OIDC** sign-in (Google / Microsoft): routes, env, invite-only linking, migration **`20260405_users_oauth_oidc.sql`** (**4.19.0**)
- **[SESSION_SECURITY_AND_MFA.md](SESSION_SECURITY_AND_MFA.md)** - Tenant session timeouts, expiry warning dialog, optional staff TOTP MFA (**4.26.0**)
- **[SHIFTOVER_IMPLEMENTATION_PLAN.md](SHIFTOVER_IMPLEMENTATION_PLAN.md)** - ShiftOver roadmap, phase tracking, implementation status (production-ready baseline)
- **[SHIFTOVER_SYSTEM_ADDENDUM.md](SHIFTOVER_SYSTEM_ADDENDUM.md)** - ShiftOver naming/route governance and open-items behavior reference
- **[REPORTS_COMPREHENSIVE_MODULE_PLAN.md](REPORTS_COMPREHENSIVE_MODULE_PLAN.md)** - Comprehensive `/reports` module plan; links all domain specs below
- **[REPORTS_CLINICAL_MODULE_PLAN.md](REPORTS_CLINICAL_MODULE_PLAN.md)** - **`/reports/clinical`** specification and R-CLIN phases; **4.21.0** R-CLIN-2–aligned baseline; **4.22.0** R-CLIN-3/4 (detail, prior compare, ambulance); **4.22.1** collapsible §4.0 operator guide
- **[REPORTS_INCIDENTS_MODULE_PLAN.md](REPORTS_INCIDENTS_MODULE_PLAN.md)** - **`/reports/incidents`** occupational / safety analytics, **`GET /api/reports/incidents`**, **R-INC** phases
- **[REPORTS_OVERVIEW_MODULE_PLAN.md](REPORTS_OVERVIEW_MODULE_PLAN.md)** - **`/reports/overview`** executive snapshot, **`GET /api/reports/overview`**, **R-OVR** phases (**4.26.0** ships R-OVR-1 baseline)
- **[REPORTS_OPERATIONS_MODULE_PLAN.md](REPORTS_OPERATIONS_MODULE_PLAN.md)** - **`/reports/operations`**, **`GET /api/reports/operations`** (**4.24.0** ships R-OPS-1–3; **R-OPS-4** after prod validation)
- **[REPORTS_COMPLIANCE_MODULE_PLAN.md](REPORTS_COMPLIANCE_MODULE_PLAN.md)** - **`/reports/compliance`** audit/SOP/legal summaries, **`GET /api/reports/compliance`**, **R-COMP** phases
- **[REPORTS_CUSTOM_MODULE_PLAN.md](REPORTS_CUSTOM_MODULE_PLAN.md)** - **`/reports/custom`** guardrailed builder, run + definitions API, **R-CUST** phases

### 🧪 Module Documentation

#### Point-of-Care Laboratory (Instant Tests) ✅
- **[INSTANT_TESTS_GUIDE.md](INSTANT_TESTS_GUIDE.md)** - Instant tests (HB, pregnancy, malaria, typhoid) for pharmacies & laboratories; customer-first subjects; feature gating. Legacy drug/alcohol/hydration testing and scheduling were purged from the UI (backend schema cleanup pending).

#### Multi-Location Care Sites System 🔄
- **[MULTI_LOCATION_SYSTEM_DOCUMENTATION.md](MULTI_LOCATION_SYSTEM_DOCUMENTATION.md)** - Complete technical documentation
- **[MULTI_LOCATION_QUICK_START.md](MULTI_LOCATION_QUICK_START.md)** - Quick start guide (5 minutes)
- **[MULTI_LOCATION_SUMMARY.md](MULTI_LOCATION_SUMMARY.md)** - Executive summary and business case

#### Admin Panel Enhancements ✅
- **[ADMIN_PANEL_TABLE_VIEW_ENHANCEMENTS.md](ADMIN_PANEL_TABLE_VIEW_ENHANCEMENTS.md)** - Complete documentation of table view enhancements, toggle functionality, and UI improvements

#### Medical Visit Disposition & Referral Facilities ✅
- **[REFERRAL_FACILITIES_AND_DISPOSITION.md](REFERRAL_FACILITIES_AND_DISPOSITION.md)** - Disposition options (Return to Work, Transferred to Hospital, Other), tenant referral facilities CRUD, and medical visit integration

#### Employee wellbeing – Employee Wellbeing Hub ✅
- **[WELLBEING_MODULE_PLAN.md](WELLBEING_MODULE_PLAN.md)** - Comprehensive design and architecture plan for the Employee wellbeing module (follow-ups, Work fitness & medications, feedback, dashboard)
- **[WELLBEING_IMPLEMENTATION_STATUS.md](WELLBEING_IMPLEMENTATION_STATUS.md)** - Implementation status and RBAC/notification details for the Employee wellbeing module

#### Ambulance & EMS Module ✅
- **[AMBULANCE_MANAGEMENT_AND_INVENTORY_PLAN.md](AMBULANCE_MANAGEMENT_AND_INVENTORY_PLAN.md)** - Fleet, pre-start, on-board inventory, transfer/receiving model, and phase roadmap

#### Tenant SOP (Standard Operating Procedures) ✅
- **[SOP_MODULE_PLAN.md](SOP_MODULE_PLAN.md)** — Product / UX plan  
- **[SOP_MODULE_IMPLEMENTATION.md](SOP_MODULE_IMPLEMENTATION.md)** — Schema, API, routes (`/sop`, `/admin/sops`), migrations, editor

#### Customer & supplier portal ✅
- **[PORTAL_GUIDE.md](PORTAL_GUIDE.md)** — Customer/supplier portal: enablement, auth (magic link, password, access requests), admin provisioning, customer ordering (pickup/delivery), supplier PO views + invoicing, data model
- **[PORTAL_STYLES.md](PORTAL_STYLES.md)** — Isolated portal CSS system, tokens, shell classes (**4.31.0**)
- **[TELEHEALTH_PLAN.md](TELEHEALTH_PLAN.md)** — LiveKit WebRTC + optional Teams provider
- **[TELEHEALTH_UI.md](TELEHEALTH_UI.md)** — In-app room UI (pre-join, waiting, in-call, ended)
- **[APPOINTMENT_NOTIFICATIONS.md](APPOINTMENT_NOTIFICATIONS.md)** — Appointment event notification matrix

#### Encounter-first clinical model ✅ (4.27.0)
- **[ENCOUNTER_FIRST_MODEL.md](ENCOUNTER_FIRST_MODEL.md)** — Encounters API and schema
- **[ENCOUNTER_LIFECYCLE_FRAMEWORK.md](ENCOUNTER_LIFECYCLE_FRAMEWORK.md)** — Lifecycle rules and pathways
- **[ENCOUNTER_SCHEMA_MIGRATION.md](ENCOUNTER_SCHEMA_MIGRATION.md)** — DB migration notes
- **[ENCOUNTER_PATIENT_FLOWS.md](ENCOUNTER_PATIENT_FLOWS.md)** — Patient-facing encounter flows

#### FHIR interoperability ✅ (4.27.0 baseline)
- **[FHIR_INTEROPERABILITY_FLOWS.md](FHIR_INTEROPERABILITY_FLOWS.md)** — Partners, bundles, ingest

#### Incidents ✅
- **[INCIDENT_STATUS_LIFECYCLE.md](INCIDENT_STATUS_LIFECYCLE.md)** — Close flow and drill/simulation flag

#### Session handoff
- **[NEXT_DEV_SESSION.md](NEXT_DEV_SESSION.md)** — Staging checklist and next dev priorities

#### Super Admin commercial collateral ✅ (4.16.0+)
- **[MINEAID_ENTERPRISE_CONCEPT_NOTE.md](MINEAID_ENTERPRISE_CONCEPT_NOTE.md)** — Enterprise concept note; in-app print **`/super-admin/concept-note`**
- **[MINEAID_BUSINESS_PROPOSAL.md](MINEAID_BUSINESS_PROPOSAL.md)** — Enterprise business proposal; in-app print **`/super-admin/business-proposal`**
- **[MINEAID_PITCH_DECK_V2_START_WITH_WHY.md](MINEAID_PITCH_DECK_V2_START_WITH_WHY.md)** — Narrative maintenance for the **Start With Why** deck (`/super-admin/pitch-why`)
- **[AGA_OBUASI_MINEAID_PITCH_SOURCE.md](AGA_OBUASI_MINEAID_PITCH_SOURCE.md)** — Stakeholder narrative source for the **AGA Obuasi** deck (`/super-admin/pitch-aga-obuasi`)
- **[UMA_OBUASI_MINEAID_PITCH_SOURCE.md](UMA_OBUASI_MINEAID_PITCH_SOURCE.md)** — **UMA (Underground Mining Alliance)** contractor / First Aider narrative (`/super-admin/pitch-uma-obuasi`) — **4.17.0**

#### Public legal templates & manual signing (**4.18.0**)

- **Public hub:** `/legal`, `/legal/:docId` — markdown under **`COMMERCIAL_AGREEMENT.md`**, **`DATA_PROCESSING_ADDENDUM.md`**, **`BUSINESS_ASSOCIATE_AGREEMENT_TEMPLATE.md`**, **`SUBPROCESSORS.md`**; API `GET /api/legal/*`.
- **Tenant upload:** `/admin/legal-agreements` — executed PDF/Word after manual signing; migration **`20260404_tenant_signed_legal_documents.sql`**.
- **Super Admin:** `/super-admin/signed-legal-documents` — cross-tenant list/download via authenticated file proxy.

## Quick Start

### For Developers
1. Review [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for current system capabilities
2. Check [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for endpoint specifications
3. Follow [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for environment setup

### For Administrators
1. Super admins register with `role='super_admin'` (no tenantId) and login normally
2. After login, global super admins land on **`/super-admin/dashboard`**; the tabbed platform console is at **`/super-admin`** (hash tabs, e.g. `#tenants`)
3. Use the Admin panel at `/admin` for tenant-level user management
   - **New in 3.2.0**: Table view with toggle functionality for all admin tabs
   - Sequential ID column (1, 2, 3...) for easier reference
   - Company filter for employee management
   - Employee-based user invitation system
4. Review audit logs for compliance tracking and system monitoring

### For End Users
1. Access the system through staff authentication (email/password) or optional OIDC
2. Navigate through the tabbed interface for different healthcare modules
3. Use the dashboard for real-time metrics and system overview

## System Architecture

### Multi-Tenant Hierarchy
```
Super Admin
├── Tenant Organizations (Mining Sites)
    ├── Companies (Contractors)
        ├── Employees (Workers)
            ├── Users (Medical Staff)
                └── Patients (Healthcare Recipients)
```

### Core Modules
- **Patient Management** - Complete patient records with medical history
- **Appointment Scheduling** - Full appointment lifecycle management
- **Medical Visits** - Detailed examination documentation
- **Incident Reporting** - Comprehensive incident tracking and investigation
- **Operational Duties** - Daily task assignment and completion tracking
- **Audit Logging** - Complete system activity tracking for compliance
- **Point-of-Care Laboratory** - Instant tests (HB, pregnancy, malaria, typhoid) for pharmacies; gated by the `poc_testing` platform flag and per-business toggle ✅
- **Multi-Location Care Sites** - Session-based location tracking for distributed medical facilities 🔄 (Design Complete)
- **Tenant SOP library** - Published standard operating procedures (`/sop`) with admin authoring and approval (`/admin/sops`) ✅
- **Customer & supplier portal** - Tenant-scoped portal accounts linked to customer/supplier records; settings, access requests, magic-link sign-in, customer ordering (pickup/delivery) with staff order management, supplier PO views + invoicing ✅ (see [PORTAL_GUIDE.md](PORTAL_GUIDE.md))
- **In-app changelog** - `GET /api/changelog` + **`/changelog`** page (markdown from [CHANGELOG.md](CHANGELOG.md)) ✅
- **Super Admin pitch & print documents** — Fullscreen decks (`/super-admin/pitch`, `/super-admin/pitch-why`, `/super-admin/pitch-uma-obuasi`, `/super-admin/pitch-aga-obuasi`) and print surfaces (`/super-admin/concept-note`, `/super-admin/business-proposal`) ✅

## Key Features

### ✅ Production-Ready Components
- **Complete Multi-Tenant Architecture** with bulletproof data isolation
- **Staff authentication** (email/password) with optional OIDC (Google / Microsoft)
- **Super Admin System** with tenant plan management
- **Comprehensive CRUD Operations** across all modules
- **System-Wide Audit Logging** for regulatory compliance
- **Professional Email Integration** using Gmail SMTP
- **Cost-Effective Local File Storage** for profiles and documents

### 🚀 Advanced Capabilities
- **Admin Panel Table Views** with toggle functionality (table/card views) for all management tabs ✅
- **Sequential ID Display** (1, 2, 3...) for easier reference and communication
- **Alternating Row Backgrounds** for improved table readability
- **Enhanced Employee Management** with company filtering and employee-based user invitation ✅
- **Responsive Header Design** with improved breakpoints (1280px for navigation, 768px for location)
- **Real-Time Status Management** for appointments and incidents
- **Interactive Plan Management** (Basic/Premium/Enterprise)
- **Cross-Tenant User Management** with approval workflows
- **Professional Email Notifications** with branded templates
- **Mobile-Responsive Design** with enhanced accessibility

## Security & Compliance

### Authentication & Authorization
- **Multi-Level Authentication**: Super Admin, Tenant Admin, Standard User
- **Secure Password Hashing** with bcrypt (12 salt rounds)
- **Session Management** with secure token generation
- **Environment-Based Security** with fallback mechanisms

### Data Protection
- **Complete Tenant Isolation** preventing cross-tenant access
- **Comprehensive Audit Trails** for all system operations
- **Secure Email Integration** with professional templates
- **Regulatory Compliance** ready for mining industry standards

## Deployment Status

### Development Environment ✅
- Fully functional with all features operational
- Mock services for testing email and notifications
- Complete database migrations applied

### Production Environment ✅
- **Ready for immediate deployment**
- Gmail SMTP configured for email services
- Local file storage eliminating cloud costs
- Environment variables documented
- Administrative systems fully operational

## Support & Maintenance

### Version Tracking
- Semantic versioning with clear release notes
- Feature completeness tracking with detailed status
- Migration guides for schema changes
- Backward compatibility maintenance

### Technical Debt Management
- Prioritized improvement roadmap
- Performance optimization planning
- Security enhancement tracking
- Documentation maintenance schedule

## Contributing

### Documentation Updates
When making changes to the system:
1. Update relevant documentation files in this folder
2. Increment version numbers appropriately
3. Add detailed changelog entries
4. Update implementation status tracking

### Code Changes
1. Follow the established multi-tenant architecture
2. Ensure all operations include proper audit logging
3. Maintain tenant data isolation principles
4. Add comprehensive error handling and validation

---

**Maintained by**: MineAid Development Team  
**Architecture**: Multi-tenant with Super Admin oversight  
**Status**: Production-ready healthcare management system  
**Last Updated**: April 21, 2026

For technical support or feature requests, consult the implementation team.