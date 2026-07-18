# Backend Architecture

**Routes handle HTTP; controllers handle business flow and call storage/services; storage handles persistence.**

## Layers

| Layer | Responsibility |
|-------|----------------|
| **Routes** | Parse auth, params, and body; validate input (e.g. Zod); call controller; map controller result to HTTP (status codes, `sendError`, `res.json`). No business logic. |
| **Controllers** | Business flow: orchestrate storage and optional services (e.g. notifications). No `req`/`res`; accept plain arguments, return result objects `{ ok, data }` or `{ ok: false, error, code? }`. |
| **Storage** | Persistence only (database). Implements `IStorage`; used by controllers. |

## Example: Create incident report

**Route** (HTTP only):

```ts
router.post(
  "/incident-reports",
  authMiddleware,
  injectLocationMiddleware,
  validateBody(insertIncidentReportSchema.omit({ reportedById: true })),
  async (req, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const reportData = { ...req.body, reportedById: req.user.claims?.sub || userId };
    const result = await controller.create(tenantId, userId!, reportData);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(201).json(result.data);
  }
);
```

**Controller** (business flow, no HTTP):

```ts
async create(
  tenantId: string,
  userId: string,
  data: InsertIncidentReport
): Promise<IncidentResult<IncidentReport>> {
  try {
    const report = await storage.createIncidentReport(data, tenantId, userId);
    return { ok: true, data: report };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to create incident report",
    };
  }
}
```

When adding or changing behaviour, keep this split: routes → controller → storage (or service).
