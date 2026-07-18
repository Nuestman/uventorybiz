# Next development session — resume guide

**Release prepared:** 4.34.0 (July 1, 2026)  
**Branch for staging:** `development` → push to `origin/development`  
**Latest commit area:** Drizzle migration journal, SQL seed cleanup, portal marketing UX

---

## Staging deploy checklist

1. **Pull** latest `development` on the staging host.
2. **Run migrations** (Neon DB) — see **[DRIZZLE_MIGRATIONS.md](./DRIZZLE_MIGRATIONS.md)**:
   - **Existing DB (already on legacy SQL):** one-time `npm run db:drizzle-baseline -- --confirm` if not done yet.
   - **Schema (new journal entries since last deploy):** `npm run db:drizzle-migrate` (applies `0002+` only if baselined).
   - **Seeds (idempotent):** `npm run db:seed` — notification types + staff prefs + portal defaults.
   - Set **`DATABASE_URL` in `.env` only** before running.
3. **Env vars** — copy from `.env.example` (telehealth, SMTP for magic links, optional Twilio).
4. **Restart** server after env + migrations.
5. **Smoke test** (see below).

---

## Staging smoke tests (priority order)

| # | Area | What to verify |
|---|------|----------------|
| 1 | **Migrations** | App starts; `drizzle.__drizzle_migrations` count matches journal |
| 2 | **Notifications** | `notification_types` populated; admin can receive alerts |
| 3 | **Portal marketing** | `/portal` shows marketing page; signed-in user sees “Go to dashboard” |
| 4 | **What's New** | Staff + portal users see dialog once per release; Got it dismisses until next version |
| 5 | **Portal mobile nav** | Hamburger opens full sidebar sheet on phone |
| 6 | **Portal notification prefs** | Profile → notification toggles save |
| 7 | **Portal access request** | Employee email on file → request succeeds; admin queue works |
| 8 | **Feedback widget** | Vertical tab on right edge opens dialog |

Log defects as GitHub issues tagged `4.34.0-staging`.

---

## What shipped in 4.34.0 (summary)

| Area | Highlights |
|------|------------|
| **Drizzle** | Tracked journal (`drizzle/`), migrate/baseline/generate scripts |
| **Seeds** | `migrations/seeds/` + `db:seed` / `db:seed:optional` |
| **Archive** | Legacy `migrations/*.sql` → `_archive/legacy_upgrades/` |
| **Env** | `.env` only for all DB tooling |
| **Portal** | Marketing page CTAs for authenticated users; accent headings |
| **Public** | Portal links → `/portal` (no forced sign-in modal) |

---

## Known issues / watch on staging

- **Missing notification prefs for new admins:** Re-run `npm run db:seed` after onboarding tenants.
- **Fresh Neon branch:** Use `db:drizzle-migrate` then `db:seed` — do not run archived legacy SQL.

---

## After staging validation

- Merge `development` → `main` when smoke tests pass.
- Tag release `v4.34.0` if you use git tags for deploys.
- Update curated release notes in `shared/curatedReleaseNotes.ts` if users should see a What's New dialog for 4.34.0 (staff-facing DB changes are usually omitted from portal copy).
