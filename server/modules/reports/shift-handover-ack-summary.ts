import { and, count, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "../../config/db";
import { shiftReportAcknowledgments, shiftReports } from "@shared/schema";

export type ShiftReportScopeOpts = {
  tenantId: string;
  from: string;
  to: string;
  locationIds?: string[];
  shiftReportShifts?: string[];
  onlyWithIssues?: boolean;
};

/** Reusable WHERE fragments for shift reports in a calendar date range (report_date). */
export function buildShiftReportsWhereClause(opts: ShiftReportScopeOpts): SQL[] {
  const clauses: SQL[] = [
    eq(shiftReports.tenantId, opts.tenantId),
    gte(shiftReports.reportDate, opts.from),
    lte(shiftReports.reportDate, opts.to),
  ];
  if (opts.locationIds?.length) clauses.push(inArray(shiftReports.locationId, opts.locationIds));
  if (opts.shiftReportShifts?.length) clauses.push(inArray(shiftReports.shift, opts.shiftReportShifts));
  if (opts.onlyWithIssues) clauses.push(eq(shiftReports.hasIssues, true));
  return clauses;
}

export function shiftReportsInRangeWhere(opts: ShiftReportScopeOpts): SQL {
  return and(...buildShiftReportsWhereClause(opts))!;
}

/**
 * Shift handover acknowledgment KPIs for compliance and operations reports.
 * Counts acknowledgments tied to shift reports matching the same scope as submitted reports.
 */
export async function fetchShiftHandoverAckSummary(opts: ShiftReportScopeOpts): Promise<{
  shiftReportsSubmitted: number;
  shiftReportAcknowledgmentCount: number;
}> {
  const shiftWhere = shiftReportsInRangeWhere(opts);
  const [[shiftRow], [ackRow]] = await Promise.all([
    db
      .select({ submitted: sql<number>`count(*)::int` })
      .from(shiftReports)
      .where(shiftWhere),
    db
      .select({ c: count() })
      .from(shiftReportAcknowledgments)
      .innerJoin(shiftReports, eq(shiftReports.id, shiftReportAcknowledgments.shiftReportId))
      .where(shiftWhere),
  ]);
  return {
    shiftReportsSubmitted: Number(shiftRow?.submitted ?? 0),
    shiftReportAcknowledgmentCount: Number(ackRow?.c ?? 0),
  };
}
