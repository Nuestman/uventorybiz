# MineAid HMS – Offline Mode & Sync Design

**Status**: Draft – design approved; **partial implementation** (see §11)  
**Target Version**: 4.9.0 (proposed)  
**Author**: MineAid Development Team  
**Last Updated**: June 2026

---

## 1. Problem Statement & Goals

MineAid HMS is used in environments where users frequently work **underground or in remote field locations with no internet connectivity**. Clinical and operational tasks must continue safely, with data synchronized when connectivity returns.

**Primary goals**

- **Offline-first UX**: Core workflows must remain available and reliable when completely offline.
- **Automatic + manual sync**: Data created/edited offline should:
  - Sync automatically when the device goes online.
  - Be triggerable manually via a “Sync now” control.
- **Safe conflict handling**: When multiple users edit the same record (e.g. patient, visit) independently, conflicts must be handled predictably, without data loss and with auditability.
- **Security & privacy**: Offline storage must respect healthcare data sensitivity (encryption, access control, audit).

**Non-goals (for this phase)**

- Building a separate native mobile application (web app / PWA only for now).
- Fully decentralized multi-device conflict-free replication (we’ll use pragmatic server-authoritative sync with clear rules).
- Offline support for every single feature from day one – we start with a **high-value subset** then expand.

---

## 2. Scope – What Will Work Offline (Phase 1)

Phase 1 focuses on **core clinical care and basic operations**:

- **Authentication session reuse**
  - User **must sign in while online** first.
  - Once authenticated, the current session can be reused offline for a configurable duration (e.g. 24–72 hours) on that device.

- **Patient-centric workflows**
  - View **recently accessed patients** (cached subset).
  - Register new patients.
  - Record **medical visits / encounters** (subjective, objective, assessment, plan, vitals, disposition).
  - Record **triage & vitals**.

- **Scheduling & visits**
  - View today’s appointments that were previously synced.
  - Create/update basic appointments for the current location.

- **Operational duties & shift notes (limited)**
  - View today’s assigned duties for the user/location after an initial sync.
  - Mark duties as completed / cancelled while offline.

Later phases can extend to:

- Incidents, inventory transactions, Employee wellbeing follow-ups, reports, and admin functions.
- **Secure messaging** — read cached threads; queue outbound messages (see §11).

---

## 3. High-Level Architecture

### 3.1 Overview

We adopt an **offline-first architecture** with:

- **Client-side**
  - React + Vite single page app enhanced to a **Progressive Web App (PWA)**.
  - **Service worker**: App shell / asset caching and online/offline detection.
  - **IndexedDB-backed local datastore**: Typed tables for patients, visits, duties, appointments, etc.
  - **Sync engine**:
    - Tracks local changes as **operations** (create/update/delete).
    - Replays operations to the backend when online.
    - Pulls server-side changes since last sync.

- **Server-side**
  - New **sync-specific endpoints** and versioning:
    - `POST /api/sync/changes` – push batched operations from client.
    - `GET /api/sync/changes?since=<cursor>` – pull changes since last cursor.
  - Per-table **versioning** using `updated_at` and/or `version` columns.
  - **Conflict resolution** logic at the domain/service layer.
  - **Audit logging** and sync diagnostics.

### 3.2 Key Design Principles

- **Server is source of truth**: Client caches and operations are reconciled to server state; the server maintains canonical records.
- **Idempotent, replayable operations**: Clients can safely retry batches without creating duplicates.
- **Per-device sync cursors**: Each device tracks its own `lastSyncCursor` so multiple devices can sync independently.
- **Minimal invasive changes**: Existing REST endpoints remain; we introduce a dedicated sync layer and incremental refactors.

---

## 4. Client Architecture – Offline Datastore & Sync Engine

### 4.1 Data Storage: IndexedDB via a Small Wrapper

We introduce an `offlineStore` module that wraps IndexedDB access, likely backed by a helper library (e.g. Dexie) or a thin custom wrapper.

**Core tables (Phase 1)**

- `patients`
  - `id` (server UUID or numeric id)
  - `clientId` (temporary UUID used before server assignment)
  - `tenantId`
  - `basic demographics fields` (name, DOB, gender, etc.)
  - `updatedAt`
  - `isDeleted`

- `medicalVisits`
  - `id`, `clientId`, `tenantId`, `patientId`/`patientClientId`
  - key visit fields (triage, vitals, assessment, disposition, etc.)
  - `updatedAt`
  - `isDeleted`

- `appointments`
  - `id`, `clientId`, `tenantId`, `patientId`/`patientClientId`, `locationId`
  - time fields, status, notes
  - `updatedAt`
  - `isDeleted`

- `operationalDuties`
  - Subset required to show user’s assigned duties.

- `operationsQueue`
  - Stores **pending changes** to be synced to server.

**Operations queue entry structure (conceptual)**

```ts
type OperationType = "CREATE" | "UPDATE" | "DELETE";

interface SyncOperation {
  id: string; // local operation id (UUID)
  entityType: "patient" | "medicalVisit" | "appointment" | "operationalDuty" | ...;
  entityId?: string; // server id, if known
  clientId?: string; // client-generated id (for new entities)
  tenantId: string;
  userId: string;
  operationType: OperationType;
  payload: Record<string, unknown>; // partial or full representation
  baseVersion?: number | string; // version at time of edit (optimistic concurrency)
  createdAt: string; // local timestamp
  retryCount: number;
  lastError?: string;
}
```

### 4.2 Sync Client Abstraction

Introduce a `syncClient` abstraction (e.g. `client/src/sync/syncClient.ts`) that components use **instead of calling REST APIs directly** for offline-capable flows.

Example high-level API:

```ts
// Sync-aware APIs used by React components
syncClient.savePatient(patientDraft);
syncClient.saveMedicalVisit(visitDraft);
syncClient.completeDuty(dutyId);
syncClient.fetchPatient(id);
syncClient.listTodayAppointments(filters);
```

**Behavior**

- When **online**:
  - Writes: call REST/sync endpoints, apply server response, update local cache.
  - Reads: use local cache as primary store, but may refresh from server.
- When **offline**:
  - Writes: create `SyncOperation` entries in `operationsQueue`, optimistically update local cache.
  - Reads: use local IndexedDB store only.

### 4.3 Connectivity & Sync Loop

- Connectivity detection via:
  - `window.navigator.onLine` and `online/offline` events.
  - Optional periodic **heartbeat** ping to the server for more accurate status.
- A **sync loop** runs when:
  - The app starts (if online).
  - The `online` event fires (transition from offline→online).
  - User taps **“Sync now”**.

**Sync loop steps (per tenant + user + device)**

1. **Push phase**
   - Read pending operations from `operationsQueue`.
   - Batch and send to `POST /api/sync/changes`.
   - Server:
     - Applies them transactionally.
     - Responds with mapping of `clientId` → `serverId` and any conflicts or errors.
   - Client:
     - Updates local entities (replace `clientId` with `serverId` where needed).
     - Marks successful operations as completed (remove from queue).
     - Marks failures with error and increases `retryCount`.

2. **Pull phase**
   - Call `GET /api/sync/changes?since=<lastSyncCursor>`.
   - Server:
     - Returns all changes for the tenant relevant to the user since the cursor:
       - New/updated patients, visits, appointments, duties, etc.
       - Updated `syncCursor`.
   - Client:
     - Upserts changes into local IndexedDB.
     - Updates its local `lastSyncCursor`.

3. **Status**
   - Update UI state (e.g. `Idle`, `Syncing`, `Error`) and show counts (X operations pending, last sync time).

---

## 5. Server Architecture – Sync Endpoints & Versioning

### 5.1 Versioning Strategy

For each offline-capable table (e.g. `patients`, `medical_visits`, `appointments`, `operational_duty_*`), ensure:

- `updated_at` timestamp is present and updated on mutation.
- Optionally, a numeric `version` column (monotonic integer) that increments on each update:
  - Helps detect **stale writes** from offline clients.

We will:

- Use `updated_at` for incremental sync in `GET /api/sync/changes`.
- Use `version` (if present) for per-entity conflict detection in `POST /api/sync/changes`.

### 5.2 POST /api/sync/changes (Push)

**Request shape (conceptual)**

```ts
interface SyncChangesRequest {
  deviceId: string;
  lastSyncCursor?: string; // optional, for diagnostics
  operations: SyncOperation[]; // as defined in section 4.1
}
```

**Response**

```ts
interface SyncChangesResponse {
  appliedOperationIds: string[]; // operations successfully applied
  failedOperations: Array<{
    operationId: string;
    errorCode: string;
    message: string;
    conflict?: ConflictDetails;
  }>;
  idMappings: Array<{
    entityType: string;
    clientId: string;
    serverId: string;
  }>;
}
```

**Behavior**

- Uses existing multi-tenant auth/session to derive `tenantId`, `userId`.
- Validates each operation by entity type.
- Applies operations in a transaction (or scoped transactions per entity batch) to preserve consistency.
- Logs each operation in a **sync log table** for observability and audits.

### 5.3 GET /api/sync/changes (Pull)

**Endpoint**

- `GET /api/sync/changes?since=<cursor>&limit=<optional>`

**Response (conceptual)**

```ts
interface SyncChange {
  entityType: string;
  entityId: string;
  operationType: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>; // latest representation (or minimal projection)
  updatedAt: string;
}

interface SyncPullResponse {
  changes: SyncChange[];
  nextCursor: string | null;
}
```

**Cursor design options**

- **Option A – Timestamp cursor**: `since` represents the last `updated_at` seen, plus tie-breaker (e.g. id).
- **Option B – Numeric/log cursor**: Use a dedicated `sync_events` table with an auto-increment id; `since` is the last event id.

We favor **Option B** for robustness:

- Less sensitive to clock skew.
- Simplifies ordering across tables.

---

## 6. Conflict Resolution

Conflicts occur when:

- Client submits an operation based on an **out-of-date version** of an entity that has been changed on the server since.

### 6.1 General Strategy

- Use **optimistic concurrency**:
  - Client sends `baseVersion` (server entity version at time of edit).
  - Server compares `baseVersion` vs current.
  - If mismatched and same fields are affected, that is a conflict.

- Default rule: **Last-write-wins with logging**:
  - Server applies the newer update.
  - Logs a conflict event for audit and possible manual review.

### 6.2 Entity-Specific Rules (Phase 1)

- **Patients**
  - Merge non-overlapping fields (e.g. one edit updates address, another updates phone).
  - If both edits touched the same field, last-write-wins and log conflict.

- **Medical visits / encounters**
  - Prefer **append-only** data where possible (e.g. additional notes in a separate table) to reduce destructive conflicts.
  - If structured fields conflict (e.g. vitals edited simultaneously), last-write-wins with conflict log.

- **Appointments**
  - Last-write-wins on status and timing fields is acceptable.

- **Operational duties**
  - Completion timestamps and status follow last-write-wins; however, completion events are often append-only and can be preserved as separate records.

### 6.3 Surfacing Conflicts to Users (Phase 2+)

Later enhancement:

- Optionally show a **“Sync conflicts”** screen where designated roles (e.g. supervisor) can:
  - View conflict details.
  - See both versions.
  - Decide on final resolution.

For Phase 1, we rely on logs and server-side rules only.

---

## 7. Security, Privacy & Compliance

- **Local data encryption**
  - Use OS-level disk encryption as a baseline.
  - For highly sensitive installations, add **application-level encryption** of IndexedDB payloads using a key derived from user credentials or device-bound secrets.

- **Offline session constraints**
  - Enforce **max offline session duration** (e.g. 72 hours) after which the user must re-authenticate online.
  - On logout, purge sensitive local data where appropriate (except records needed for other logged-in users on the same device, if applicable).

- **PII minimization**
  - Cache only the data necessary for offline workflows (e.g. recent patients, not full historical dataset).
  - Provide configuration to limit how many days of history are cached per device.

- **Audit trails**
  - Existing audit logging on the server remains primary.
  - Sync endpoints log:
    - Which device and user submitted which operations.
    - Time of first creation and sync.
    - Any conflicts detected.

---

## 8. UX & UI Behavior

### 8.1 Connectivity Indicator

- Global banner / indicator showing:
  - **Online** – All features available.
  - **Offline** – Using cached data; new changes will sync later.
  - **Syncing…** – Show progress or spinner.
  - **Sync failed** – Show retry option and brief error.

### 8.2 Sync Controls

- **Automatic sync**
  - Triggered when app regains connectivity.
  - Also runs on app launch if online.

- **Manual sync**
  - “Sync now” button in a global menu, showing:
    - Number of pending changes.
    - Time of last successful sync.

### 8.3 Pending Changes Indicators

- For records created/edited offline:
  - Show **“Pending sync”** badges where appropriate (e.g. on visit, patient, appointment rows).
  - Once server confirm is received, badge is removed.

### 8.4 Error Handling

- If some operations fail:
  - Keep them in queue with error state.
  - Bubble up a **non-blocking toast** and an optional “View details” screen.
  - Retry automatically with backoff; allow user-initiated retry from the UI.

---

## 9. Implementation Plan (Phased)

### Phase 0 – Foundations & Feature Flag

- Add **feature flag** / configuration to enable offline mode per environment/tenant.
- Add simple **connectivity hook** (`useOnlineStatus`) and UI indicator (banner only, no offline data yet).

### Phase 1 – PWA + Local Datastore + Basic Sync

1. **PWA enablement**
   - Add web app manifest and icons.
   - Register a service worker for:
     - App shell caching.
     - Basic offline fallback behavior.

2. **Offline datastore**
   - Implement `offlineStore` with IndexedDB tables outlined in section 4.1.
   - Add serialization / deserialization helpers for core entities.

3. **Sync client abstraction**
   - Introduce `syncClient` module used by:
     - Patient registration and recent patients retrieval.
     - Medical visit creation & editing.

4. **Server sync APIs (MVP)**
   - Implement `POST /api/sync/changes` for patients and medical visits.
   - Implement `GET /api/sync/changes` with simple `updated_at`-based cursor.

5. **Sync loop**
   - Implement core sync loop (push + pull) with minimal UI.

### Phase 2 – Scheduling & Operational Duties

- Extend local datastore and sync client to:
  - Appointments for today / current location.
  - Operational duties assignment and completion.
- Extend server sync APIs to cover additional entities.
- Improve conflict rules in domain-specific ways.

### Phase 3 – Observability, Conflict UI, Hardening

- Add dashboards / logs for:
  - Sync success/failure rates.
  - Queue sizes.
  - Average time from offline entry to server persistence.
- Optional UI for conflict review and manual resolution.
- Load and resilience testing.

---

## 10. Open Questions & Decisions Needed

1. **Target devices & OS**
   - Which platforms are primary (e.g. rugged tablets, laptops, phones)?
   - Any OS-level encryption or MDM constraints we must integrate with?

2. **Max offline duration**
   - Operationally acceptable maximum (e.g. 24 vs 72 hours)?

3. **Data retention on device**
   - How many days of history should be cached?
   - Policy for stale cached data on shared devices?

4. **Initial scope of entities**
   - Confirm Phase 1 entities:
     - Patients, medical visits, triage/vitals, appointments, operational duties (subset).

5. **Conflict visibility**
   - For Phase 1, are server logs sufficient, or do we need an in-app “conflicts” screen from the start?

These questions can be refined as we move into implementation, but they do not block initial work on the shared infrastructure (PWA, offline store, sync endpoints).

---

## 11. Implementation status (in progress)

**Client**

- **Connectivity**: `useOnlineStatus`, global `ConnectivityBanner`.
- **IndexedDB** (`offlineStore` v4): patients, medical visits, appointments (stores), operations queue, meta (auth cache), **triage** (v2), **messaging** (inbox cache, thread cache, outbox, local conversations), **portal symptoms** (types cache, logs cache, outbox).
- **Auth**: `useAuth` caches user in meta; falls back to cached user when offline.
- **Patients**: `fetchPatientsOfflineFirst` — online fetch + cache; offline reads from IndexedDB.
- **Medical Visit page**: offline triage save queues sync op + **`putTriage`**; merges server + IDB triage for same-day gate; **visit form** gets `chiefComplaint` / `visitDate` from offline triage path; offline triage vitals show via `vitalsSnapshot` when `pendingSync`.
- **Secure messaging**: `offlineMessaging.ts` — cache inbox/threads; queue `create_conversation` / `send_message` with `clientMessageId`; optimistic UI + pending badges; `syncMessagingOutbox` on reconnect (staff + portal).
- **Portal symptoms**: `offlineSymptoms.ts` — cache symptom types and logs per patient; queue create/update/delete in `portalSymptomOutbox`; optimistic UI + pending badges; `syncPortalSymptomOutbox` on reconnect. See [PORTAL_HEALTH_SYMPTOMS_TRACKER_PLAN.md](./PORTAL_HEALTH_SYMPTOMS_TRACKER_PLAN.md).
- **Sync client**: `queueOfflineOperation`, `runSyncOnce` → `POST /api/sync/operations`, clears applied operations from queue.
- **App**: `runSyncOnce` + `syncMessagingOutbox` + `syncPortalSymptomOutbox` when transitioning to online.

**Server**

- **`POST /api/sync/operations`**: accepts batch, logs, returns `appliedOperationIds` (no domain DB writes yet — confirms queue delivery).

**Next**

- Apply sync operations to real tables (triage, vitals, patients, medical visits) on the server.
- Remove or reconcile local IDB triage rows after successful server apply.
- Optional: `GET /api/sync/changes` pull + cursor; manual “Sync now” UI.

