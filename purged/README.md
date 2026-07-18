# Purged archive (uventorybiz transformation)

Files and modules moved here no longer serve the running **uventorybiz** app.
They are kept temporarily for reference during the transformation; nothing under
`purged/` is imported by the live server or client.

## Why

MineAid HMS clinical/healthcare surfaces were pruned so the product can become
a tenant-based business management system (inventory + POS).

## Contents (high level)

| Path | Former role |
|------|-------------|
| `server/modules/patients` | Patient CRUD APIs |
| `server/modules/encounters` | Clinical encounters |
| `server/modules/clinical` | Triage, vitals, medical visits/records |
| `server/modules/telecare` | LiveKit/Teams telehealth |
| `server/modules/fhir` | FHIR interop |
| `server/modules/reports/clinical-reports.*` | Clinical analytics |
| `client/src/pages/Patients*.tsx`, `MedicalVisit`, `Records`, `Telecare*`, `Interoperability` | Clinical UI |
| Client telecare components (`components/telecare`, `PortalTelecare*`) | LiveKit/Teams UI |
| `purged/client/src/portal/PortalVitalsPage.tsx`, `PortalVitalDetailPage.tsx` | Portal vitals UI |
| `purged/client/src/portal/PortalSymptomsPage.tsx`, `PortalSymptomDetailPage.tsx` | Portal symptoms UI |
| `purged/client/src/portal/PortalVisitsPage.tsx` | Portal visit summaries UI |
| `purged/client/src/portal/PortalWorkFitnessPage.tsx` | Portal work-fitness UI |
| `client/src/pages/super-admin/*Pitch*` etc. | MineAid commercial pitch decks |
| Root cookie dumps, Replit/Vercel remnant notes | Ops residue |

## Restore

Move a path back to its original location under the repo root if needed, then
re-wire imports/routes.

## Cleanup

After uventorybiz is stable, this directory may be deleted entirely.

## Restoring telecare / LiveKit

Telecare code under `purged/` depended on LiveKit / Teams packages and env vars that were removed from the live app (`package.json`, `server/config/env.ts`). To revive telecare, restore those dependencies and env keys from git history before re-wiring routes.

## Docs archived from `docs/` (Jul 2026)

MineAid pitch decks, encounter/FHIR/telehealth/patient/clinical pharmacy plans, and the pre-uventorybiz changelog were moved here. Live product docs start at `docs/UVENTORYBIZ.md`. Inventory status: `docs/INVENTORY_IMPLEMENTATION_SCAN.md`.
