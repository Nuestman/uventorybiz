# uventorybiz

> Multi-tenant business management with inventory and POS

**Status:** transforming from MineAid HMS (clinical prune in progress). Package version `5.0.0-transform`.

## Overview

uventorybiz is a multi-tenant B2B platform for businesses: inventory, operations (appointments, incidents, duties, tickets), ShiftOver, fleet, POC laboratory, employee wellbeing, and (upcoming) POS.

Archived clinical/MineAid code lives under [`purged/`](purged/README.md) and is not part of the running app.

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

## Note on folder name

Workspace folder may still be named `uventory` if the OS lock prevented rename; product name is **uventorybiz**.
