# Testing

This document describes the test setup, how to run tests, and how to add or extend tests in MineAid HMS.

## Overview

- **Runner:** [Vitest](https://vitest.dev/) (Node environment).
- **Scope:** Unit tests for server-side logic (e.g. notification resolution) and API integration tests (auth, protected routes). CI runs on push/PR.
- **Location:** Tests live under `server/` and are matched by pattern (see below).

## Running tests

| Command | Description |
|--------|-------------|
| `npm run test` | Run Vitest in watch mode (re-runs on file changes). |
| `npm run test:run` | Run the suite once and exit (e.g. for CI). |

Both commands use the same Vitest config and test set.

## Where tests live

- **Include patterns:** `server/**/*.test.ts` and `server/**/*.spec.ts` (see `vitest.config.ts`).
- **Convention:** Group tests in `server/__tests__/` (e.g. `server/__tests__/smoke.test.ts`, `server/__tests__/notification-preferences.test.ts`), or next to the code they test (e.g. `server/modules/foo/foo.test.ts`).

Path aliases:

- `@shared/schema` and `@shared/*` resolve to the `shared/` directory so tests can import shared types and schemas.

## Current test suites

1. **Smoke** (`server/__tests__/smoke.test.ts`)  
   - Ensures the runner and config work (e.g. a trivial assertion).

2. **Notification preference resolution** (`server/__tests__/notification-preferences.test.ts`)  
   - Unit tests for `getRecipientsForAlert()` in `server/notificationService.ts`.
   - Uses a **mocked `IStorage`** (only the methods used by the function are implemented).
   - Covers:
     - No users configured for the notification type → empty result.
     - Notification type missing → empty result.
     - Users with enabled preferences → correct users and channels.
     - Users with no preference for a non–system-level type → excluded.
     - System-level type (e.g. `equipment_health_report`) with no user preferences → default to email.

3. **API integration** (`server/__tests__/api.integration.test.ts`)  
   - Runs only when `DATABASE_URL` is set (skipped otherwise).
   - Uses a real Express app (from `server/test-app.ts`) and Node `fetch` against a temporary HTTP server.
   - Covers: 401 for protected route without auth, 401 for invalid login, 400 for invalid login body, 401 for POST incident-reports without auth, 404 for unknown path.
   - To run locally: set `DATABASE_URL` and `SESSION_SECRET` (e.g. from `.env`), then `npm run test:run`.

## Adding tests

### Unit test (e.g. service with storage)

1. Create a file under `server/` named `*.test.ts` or `*.spec.ts`.
2. Import from `vitest`: `describe`, `it`, `expect`, and `vi` (for mocks).
3. For code that depends on `IStorage`, create a minimal mock that implements only the methods the test needs, and cast to `IStorage`:

   ```ts
   const storage = {
     getUsersForNotificationType: vi.fn().mockResolvedValue([user1]),
     getNotificationTypes: vi.fn().mockResolvedValue([notificationType]),
     getNotificationPreferences: vi.fn().mockResolvedValue([pref]),
   } as unknown as IStorage;
   ```

4. Call the function under test with the mock and assert on return values or mock call counts.

### Naming and structure

- Use `describe` for the module or function and `it` for each behaviour.
- Prefer clear descriptions: e.g. “returns empty when no users are configured for the notification type”.

## Configuration

- **Config file:** `vitest.config.ts` at the project root.
- **Environment:** `node` (no browser).
- **Globals:** Vitest globals are off; use explicit imports (`import { describe, it, expect, vi } from "vitest"`).
- **Paths:** `@shared/*` is resolved to `shared/*` so tests can use the same imports as the server.

## CI

- **Workflow:** `.github/workflows/test.yml` runs on push/PR to `main` and `development`.
- **Steps:** Checkout, Node 20, `npm ci`, `npm run check`, `npm run test:run`.
- **Integration tests in CI:** They are skipped when `DATABASE_URL` is not set. To run them in CI, add a Postgres service container and set `DATABASE_URL` in the workflow.

See `docs/IMPROVEMENTS_IMPLEMENTATION_PLAN.md` (Phase 4) for the full testing roadmap.
