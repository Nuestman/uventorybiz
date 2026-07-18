import { and, asc, count, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "../../config/db";
import {
  auditLogs,
  incidentReports,
  tenantSignedLegalDocuments,
  tenantSopDocuments,
  tenantSopVersions,
  users,
} from "@shared/schema";
import { fetchShiftHandoverAckSummary } from "./shift-handover-ack-summary";

export type ComplianceReportsGroupBy = "day" | "week" | "month";

export type ComplianceReportsParams = {
  tenantId: string;
  from: string;
  to: string;
  groupBy: ComplianceReportsGroupBy;
  locationIds?: string[];
  auditActions?: string[];
  auditResourceTypes?: string[];
};

/** Weekly-rate thresholds (exceptions) — values are compared to (count / days) * 7. */
const EXCEPTION_DELETE_EVENTS_WEEKLY_RATE = 100;
const EXCEPTION_FAILED_AUTH_WEEKLY_RATE = 50;

function parseDayRange(from: string, to: string): { fromDate: Date; toDate: Date } {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);
  return { fromDate, toDate };
}

function inclusiveUtcDayCount(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const start = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function splitMulti(v: unknown): string[] | undefined {
  if (v == null || v === "") return undefined;
  if (Array.isArray(v)) return v.map(String).map((x) => x.trim()).filter(Boolean);
  return String(v)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function dateTruncExpr(grain: ComplianceReportsGroupBy, column: typeof auditLogs.createdAt): SQL {
  const unit = grain === "day" ? "day" : grain === "week" ? "week" : "month";
  return sql`date_trunc(${sql.raw(`'${unit}'`)}, ${column})`;
}

function periodKeyExpr(truncExpr: SQL, grain: ComplianceReportsGroupBy): SQL<string> {
  if (grain === "month") {
    return sql<string>`to_char(${truncExpr}, 'YYYY-MM')`;
  }
  return sql<string>`to_char(${truncExpr}, 'YYYY-MM-DD')`;
}

function buildAuditWhere(
  params: ComplianceReportsParams,
  fromDate: Date,
  toDate: Date,
): SQL {
  const clauses: SQL[] = [
    eq(auditLogs.tenantId, params.tenantId),
    gte(auditLogs.createdAt, fromDate),
    lte(auditLogs.createdAt, toDate),
  ];
  if (params.auditActions?.length) clauses.push(inArray(auditLogs.action, params.auditActions));
  if (params.auditResourceTypes?.length) {
    clauses.push(inArray(auditLogs.resourceType, params.auditResourceTypes));
  }
  return and(...clauses)!;
}

function highRiskWhereClause(): SQL {
  return sql`(
    lower(${auditLogs.action}) like '%delete%'
    or ${auditLogs.action} in ('login_failed', 'password_changed', 'logout')
  )`;
}

export type ComplianceException = {
  ruleId: string;
  severity: "info" | "warning";
  message: string;
  value: number;
  threshold: number;
};

function buildExceptions(input: {
  inclusiveDays: number;
  auditDeleteActions: number;
  auditFailedAuthCount: number;
}): ComplianceException[] {
  const d = Math.max(1, input.inclusiveDays);
  const deleteWeeklyRate = (input.auditDeleteActions / d) * 7;
  const authFailWeeklyRate = (input.auditFailedAuthCount / d) * 7;
  const out: ComplianceException[] = [];
  if (deleteWeeklyRate > EXCEPTION_DELETE_EVENTS_WEEKLY_RATE) {
    out.push({
      ruleId: "elevated_delete_rate",
      severity: "warning",
      message: `Delete-related audit events exceed ${EXCEPTION_DELETE_EVENTS_WEEKLY_RATE} per week (equivalent) for the selected window.`,
      value: Math.round(deleteWeeklyRate * 10) / 10,
      threshold: EXCEPTION_DELETE_EVENTS_WEEKLY_RATE,
    });
  }
  if (authFailWeeklyRate > EXCEPTION_FAILED_AUTH_WEEKLY_RATE) {
    out.push({
      ruleId: "elevated_failed_auth_rate",
      severity: "warning",
      message: `Failed authentication audit events exceed ${EXCEPTION_FAILED_AUTH_WEEKLY_RATE} per week (equivalent) for the selected window.`,
      value: Math.round(authFailWeeklyRate * 10) / 10,
      threshold: EXCEPTION_FAILED_AUTH_WEEKLY_RATE,
    });
  }
  return out;
}

export async function fetchComplianceReports(params: ComplianceReportsParams) {
  const { fromDate, toDate } = parseDayRange(params.from, params.to);
  const auditWhere = buildAuditWhere(params, fromDate, toDate);

  const inclusiveDays = inclusiveUtcDayCount(params.from, params.to);
  const auditPeriod = periodKeyExpr(dateTruncExpr(params.groupBy, auditLogs.createdAt), params.groupBy);

  const deleteLike = sql`lower(${auditLogs.action}) like '%delete%'`;
  const failedAuth = inArray(auditLogs.action, ["login_failed", "failed_login"]);
  const impersonationClause = sql`(${auditLogs.details}->'impersonation'->>'impersonatorUserId') is not null`;

  const [
    totalRow,
    distinctUsersRow,
    deleteRow,
    failedAuthRow,
    impersonationRow,
    highRiskRows,
    overTimeRows,
    byResourceRows,
    byActionRows,
    topActorRows,
    sopStatusRows,
    legalUploadRow,
    incidentDrillRow,
  ] = await Promise.all([
    db.select({ c: count() }).from(auditLogs).where(auditWhere),
    db
      .select({ c: sql<number>`count(distinct ${auditLogs.userId})::int` })
      .from(auditLogs)
      .where(auditWhere),
    db
      .select({ c: count() })
      .from(auditLogs)
      .where(and(auditWhere, deleteLike)),
    db
      .select({ c: count() })
      .from(auditLogs)
      .where(and(auditWhere, failedAuth)),
    db
      .select({ c: count() })
      .from(auditLogs)
      .where(and(auditWhere, impersonationClause)),
    db
      .select({
        action: auditLogs.action,
        cnt: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(and(auditWhere, highRiskWhereClause()))
      .groupBy(auditLogs.action)
      .orderBy(desc(sql<number>`count(*)::int`))
      .limit(50),
    db
      .select({
        period: auditPeriod,
        cnt: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(auditWhere)
      .groupBy(auditPeriod)
      .orderBy(asc(auditPeriod)),
    db
      .select({
        resourceType: auditLogs.resourceType,
        cnt: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(auditWhere)
      .groupBy(auditLogs.resourceType)
      .orderBy(desc(sql<number>`count(*)::int`))
      .limit(200),
    db
      .select({
        action: auditLogs.action,
        cnt: sql<number>`count(*)::int`,
      })
      .from(auditLogs)
      .where(auditWhere)
      .groupBy(auditLogs.action)
      .orderBy(desc(sql<number>`count(*)::int`))
      .limit(200),
    db
      .select({
        userId: auditLogs.userId,
        eventCount: sql<number>`count(*)::int`,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.userId))
      .where(auditWhere)
      .groupBy(auditLogs.userId, users.firstName, users.lastName, users.email)
      .orderBy(desc(sql<number>`count(*)::int`))
      .limit(20),
    db
      .select({
        status: tenantSopVersions.status,
        cnt: sql<number>`count(*)::int`,
      })
      .from(tenantSopVersions)
      .innerJoin(tenantSopDocuments, eq(tenantSopDocuments.id, tenantSopVersions.documentId))
      .where(and(eq(tenantSopDocuments.tenantId, params.tenantId), eq(tenantSopDocuments.isArchived, false)))
      .groupBy(tenantSopVersions.status),
    db
      .select({ c: count() })
      .from(tenantSignedLegalDocuments)
      .where(
        and(
          eq(tenantSignedLegalDocuments.tenantId, params.tenantId),
          gte(tenantSignedLegalDocuments.createdAt, fromDate),
          lte(tenantSignedLegalDocuments.createdAt, toDate),
        ),
      ),
    db
      .select({
        realIncidents:
          sql<number>`COALESCE(sum(CASE WHEN coalesce(${incidentReports.isDrillOrSimulation}, false) = false THEN 1 ELSE 0 END), 0)::int`,
        drillOrSimulationIncidents:
          sql<number>`COALESCE(sum(CASE WHEN ${incidentReports.isDrillOrSimulation} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(incidentReports)
      .where(
        and(
          eq(incidentReports.tenantId, params.tenantId),
          gte(incidentReports.incidentDate, fromDate),
          lte(incidentReports.incidentDate, toDate),
        ),
      ),
  ]);

  const sopVersionStatusMix = sopStatusRows.map((r) => ({
    status: String(r.status ?? "unknown"),
    count: Number(r.cnt ?? 0),
  }));

  const pendingApproval = sopVersionStatusMix.find((x) => x.status === "pending_approval")?.count ?? 0;
  const published = sopVersionStatusMix.find((x) => x.status === "published")?.count ?? 0;
  const draft = sopVersionStatusMix.find((x) => x.status === "draft")?.count ?? 0;
  const rejected = sopVersionStatusMix.find((x) => x.status === "rejected")?.count ?? 0;
  const archived = sopVersionStatusMix.find((x) => x.status === "archived")?.count ?? 0;

  const shiftHandoverAckSummary = await fetchShiftHandoverAckSummary({
    tenantId: params.tenantId,
    from: params.from,
    to: params.to,
    locationIds: params.locationIds,
  });

  const auditEventsTotal = Number(totalRow[0]?.c ?? 0);
  const auditDeleteActions = Number(deleteRow[0]?.c ?? 0);
  const auditFailedAuthCount = Number(failedAuthRow[0]?.c ?? 0);
  const realIncidentsInWindow = Number(incidentDrillRow[0]?.realIncidents ?? 0);
  const drillIncidentsInWindow = Number(incidentDrillRow[0]?.drillOrSimulationIncidents ?? 0);

  return {
    meta: {
      from: params.from,
      to: params.to,
      groupBy: params.groupBy,
      generatedAt: new Date().toISOString(),
      filters: {
        locationIds: params.locationIds ?? [],
        auditActions: params.auditActions ?? [],
        auditResourceTypes: params.auditResourceTypes ?? [],
      },
    },
    kpis: {
      auditEventsTotal,
      auditUniqueActiveUsers: Number(distinctUsersRow[0]?.c ?? 0),
      auditDeleteActions,
      auditFailedAuthCount,
      auditEventsWithImpersonationContext: Number(impersonationRow[0]?.c ?? 0),
      sopVersionsPendingApproval: pendingApproval,
      sopVersionsPublished: published,
      sopVersionsDraft: draft,
      sopVersionsRejected: rejected,
      sopVersionsArchived: archived,
      signedLegalUploadsInWindow: Number(legalUploadRow[0]?.c ?? 0),
      realIncidentsInWindow,
      drillOrSimulationIncidentsInWindow: drillIncidentsInWindow,
    },
    series: {
      auditEventsOverTime: overTimeRows.map((r) => ({
        period: String(r.period ?? ""),
        total: Number(r.cnt ?? 0),
      })),
    },
    tables: {
      auditByResourceType: byResourceRows.map((r) => ({
        resourceType: String(r.resourceType ?? "unknown"),
        count: Number(r.cnt ?? 0),
      })),
      auditByAction: byActionRows.map((r) => ({
        action: String(r.action ?? "unknown"),
        count: Number(r.cnt ?? 0),
      })),
      auditHighRiskByAction: highRiskRows.map((r) => ({
        action: String(r.action ?? "unknown"),
        count: Number(r.cnt ?? 0),
      })),
      sopVersionStatusMix,
      topAuditActors: topActorRows.map((r) => ({
        userId: String(r.userId),
        eventCount: Number(r.eventCount ?? 0),
        displayName:
          `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || String(r.email ?? r.userId),
      })),
    },
    shiftHandoverAckSummary: {
      shiftReportsSubmitted: shiftHandoverAckSummary.shiftReportsSubmitted,
      shiftReportAcknowledgmentCount: shiftHandoverAckSummary.shiftReportAcknowledgmentCount,
      shiftReportAckRate:
        shiftHandoverAckSummary.shiftReportsSubmitted > 0
          ? shiftHandoverAckSummary.shiftReportAcknowledgmentCount /
            shiftHandoverAckSummary.shiftReportsSubmitted
          : null,
    },
    exceptions: buildExceptions({
      inclusiveDays,
      auditDeleteActions,
      auditFailedAuthCount,
    }),
  };
}

export type ParsedComplianceReportsQuery = Omit<ComplianceReportsParams, "tenantId">;

export function parseComplianceReportsQuery(q: Record<string, unknown>): ParsedComplianceReportsQuery {
  const from = typeof q.from === "string" ? q.from : "";
  const to = typeof q.to === "string" ? q.to : "";
  if (!from || !to) {
    throw new Error("Query parameters `from` and `to` (YYYY-MM-DD) are required.");
  }
  const groupByRaw = typeof q.groupBy === "string" ? q.groupBy : "week";
  if (!["day", "week", "month"].includes(groupByRaw)) {
    throw new Error("`groupBy` must be day, week, or month.");
  }
  return {
    from,
    to,
    groupBy: groupByRaw as ComplianceReportsGroupBy,
    locationIds: splitMulti(q.locationIds ?? q.locationId),
    auditActions: splitMulti(q.auditActions),
    auditResourceTypes: splitMulti(q.auditResourceTypes),
  };
}
