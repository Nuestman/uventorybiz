import { and, eq, isNotNull } from "drizzle-orm";
import { careLocations } from "@shared/schema";
import { db } from "../../config/db";

const UNIT_CALL_SIGN_RE = /^Unit\s+(\d+)$/i;

type Queryable = Pick<typeof db, "select">;

/**
 * Next default call sign for a tenant fleet unit: "Unit 1", "Unit 2", …
 * Scans existing fleet `call_sign` values matching that pattern; ignores other formats.
 * Does not back-fill empty call signs on existing rows.
 */
export async function allocateNextFleetCallSign(
  tenantId: string,
  executor: Queryable = db
): Promise<string> {
  const rows = await executor
    .select({ callSign: careLocations.callSign })
    .from(careLocations)
    .where(
      and(
        eq(careLocations.tenantId, tenantId),
        eq(careLocations.locationKind, "fleet"),
        isNotNull(careLocations.callSign)
      )
    );

  let max = 0;
  for (const row of rows) {
    const m = UNIT_CALL_SIGN_RE.exec(row.callSign?.trim() ?? "");
    if (m) {
      const n = Number.parseInt(m[1]!, 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `Unit ${max + 1}`;
}
