# Referral Facilities and Medical Visit Disposition

**Version**: 4.7.0 | **Last Updated**: February 26, 2026

## Overview

Medical visit disposition options have been updated to support **Return to Work**, **Transferred to Hospital**, and **Transferred to Hospital (Other)**. When a patient is transferred to hospital, the system can record either a selected tenant-specific facility or a free-text facility name.

## Disposition Options

| Value | Label | Behaviour |
|-------|--------|-----------|
| `return_to_work` | Return to Work | No extra fields. |
| `transferred_to_hospital` | Transferred to Hospital | User must select a facility from the tenant's **referral facilities** list (dropdown). |
| `transferred_to_hospital_other` | Transferred to Hospital (Other) | User can enter a free-text **Other facility name**. |

Legacy disposition values (e.g. `light_duty`, `off_duty`, `emergency`) remain in the database for existing records and are still displayed in the details modal and formatters where applicable.

## Referral Facilities (Tenant-Scoped)

### Database

- **Table**: `referral_facilities`
  - `id`, `tenant_id`, `name`, `address`, `contact_phone`, `contact_email`, `status`, `created_at`, `updated_at`
- **Medical visits**: `transfer_facility_id` (FK to `referral_facilities`), `transfer_facility_other` (text)

### API

- **GET** `/api/referral-facilities` – List facilities for the current tenant (optional `?includeInactive=true`).
- **GET** `/api/referral-facilities/:id` – Get one facility.
- **POST** `/api/referral-facilities` – Create (admin only).
- **PUT** `/api/referral-facilities/:id` – Update (admin only).
- **DELETE** `/api/referral-facilities/:id` – Delete (admin only).

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md#referral-facilities-transfer-hospitals) for request/response details.

### Admin UI

- **Admin → Locations** tab includes a **Referral / transfer facilities** card.
- Table columns: Name, Address, Contact, Email, Status.
- **Add facility** opens a create dialog (name required; address, contact phone, email optional).
- Per-row **Actions** (⋮) menu: **Edit**, **Delete** (with confirmation).

### Medical Visit Integration

- **Create visit** (MedicalVisit.tsx): Disposition dropdown shows the three options; when "Transferred to Hospital" is selected, a **Transfer facility** dropdown is shown (populated from `/api/referral-facilities`); when "Transferred to Hospital (Other)", an **Other facility name** input is shown.
- **Edit visit** (Records, PatientDetails): Same disposition options and conditional facility fields.
- **Details modal**: Disposition badge and, when applicable, **Facility:** followed by the selected facility name or the free-text other name.

## Migrations

1. **`20260301_referral_facilities_and_transfer.sql`** – Creates `referral_facilities` table and adds `transfer_facility_id`, `transfer_facility_other` to `medical_visits`.
2. **`20260302_referral_facilities_contact_email.sql`** – Adds `contact_email` to `referral_facilities`.

Run in order on existing databases. New installs should use a schema that already includes these objects.
