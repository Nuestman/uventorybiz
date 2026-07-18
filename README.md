# uventorybiz

> Multi-tenant business management with inventory and POS

**Version:** `1.0.0`  
**Repo:** https://github.com/Nuestman/uventorybiz

## Overview

uventorybiz is a multi-tenant B2B platform: inventory, POS, operations (appointments, incidents, duties, tickets), ShiftOver, fleet, POC laboratory, employee wellbeing, and a customers/suppliers portal.

Archived clinical/MineAid code lives under [`purged/`](purged/README.md) and is not part of the running app.

See [`docs/UVENTORYBIZ.md`](docs/UVENTORYBIZ.md), [`docs/VERSION.md`](docs/VERSION.md), [`docs/CHANGELOG.md`](docs/CHANGELOG.md), and [`docs/INVENTORY_IMPLEMENTATION_SCAN.md`](docs/INVENTORY_IMPLEMENTATION_SCAN.md).

## Stack

- Node.js + Express + TypeScript
- React + Vite + Tailwind + shadcn/ui
- Drizzle ORM + Neon PostgreSQL
- Railway hosting

## Scripts

```bash
npm run dev      # API + Vite
npm run build    # client build
npm start        # production server
npm run check    # tsc
npm test         # vitest
```

## Workspace folder name

If this directory is still named `uventory`, close Cursor/terminals using it, then rename to **`uventorybiz`** and reopen. The product and npm package are already `uventorybiz`.
