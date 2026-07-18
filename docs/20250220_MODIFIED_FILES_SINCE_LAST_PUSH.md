# Modified Files Since Last Push to Remote

This file lists files that have been modified (or are untracked) relative to `origin/development`. It is intended as a reference when preparing a release or pull request. Regenerate with:

```bash
git status --short
git diff --name-only origin/development
```

## Summary

- **Version bumped to**: 4.2.0 (see [CHANGELOG.md](./CHANGELOG.md) and [VERSION.md](./VERSION.md))
- **Release 4.2.0 focus**: Operational duties full filters, overdue filter fix, responsive duty modals (see CHANGELOG [4.2.0]).

## Key files for 4.2.0 (this release)

- `server/storage.ts` – duty assignment list/history with status & userId; overdue logic and display status
- `server/modules/duties/duty-assignments/duty-assignments.controller.ts` – pass status, userId
- `server/modules/duties/duty-assignments/duty-assignments.routes.ts` – query params status, userId
- `client/src/pages/OperationalDuties.tsx` – full Filters card, overdue badge/actions, responsive modals
- `package.json` – version 4.2.0
- `docs/CHANGELOG.md` – [4.2.0] entry
- `docs/VERSION.md` – current version 4.2.0, history updated
- `docs/20250220_MODIFIED_FILES_SINCE_LAST_PUSH.md` – this file

## All modified/untracked (reference)

Run locally to get the current list:

```powershell
cd "c:\Users\nusma\Github\Cursor AI Agent\MineAidHMS"
git status --short
git diff --name-only origin/development
```

Note: The working tree may include additional changes (e.g. server module restructure, route splitting, new `server/config/` and `server/shared/`). Commit only what you intend to ship; use `git add -p` or separate commits for unrelated changes.

**Last updated**: 2025-02-20
