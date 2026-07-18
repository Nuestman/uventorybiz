import { and, count, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "../../config/db";
import {
  auditLogs,
  incidentReports,
  operationalDutyAssignments,
  shiftReportAcknowledgments,
  shiftReports,
  tickets,
} from "@shared/schema";

export type OverviewReportsParams = {
  tenantId: string;
  from: string;
  to: string;
  locationIds?: string[];
};

type SectionAccess = {
  incidents: boolean;
  clinical: boolean;
  operations: boolean;
  compliance: boolean;
};

function splitMulti(v: unknown): string[] | undefined {
  if (v == null || v === "") return undefined;
  if (Array.isArray(v)) return v.map(String).map((x) => x.trim()).filter(Boolean);
  return String(v)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseDayRange(from: string, to: string): { fromDate: Date; toDate: Date } {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);
  return { fromDate, toDate };
}

function buildLocationClause(locationIds?: string[]): SQL[] {
  if (!locationIds?.length) return [];
  return [inArray(shiftReports.locationId, locationIds)];
}

function incidentClosedExpr(): SQL {
  return sql`lower(trim(coalesce(${incidentReports.status}, ''))) IN ('closed', 'resolved')`;
}

async function loadIncidents(params: OverviewReportsParams) {
  const { fromDate, toDate } = parseDayRange(params.from, params.to);
  const where: SQL[] = [
    eq(incidentReports.tenantId, params.tenantId),
    gte(incidentReports.incidentDate, fromDate),
    lte(incidentReports.incidentDate, toDate),
  ];
  if (params.locationIds?.length) where.push(inArray(incidentReports.locationId, params.locationIds));

  const [row] = await db
    .select({
      totalInWindow: count(),
      closedCount: sql<number>`coalesce(sum(case when ${incidentClosedExpr()} then 1 else 0 end), 0)::int`,
    })
    .from(incidentReports)
    .where(and(...where));

  const total = Number(row?.totalInWindow ?? 0);
  const closed = Number(row?.closedCount ?? 0);
  return {
    totalInWindow: total,
    openCount: Math.max(0, total - closed),
    closedCount: closed,
  };
}

async function loadOperations(params: OverviewReportsParams) {
  const { fromDate, toDate } = parseDayRange(params.from, params.to);
  const openTicketWhere: SQL[] = [
    eq(tickets.tenantId, params.tenantId),
    sql`${tickets.status} NOT IN ('resolved', 'closed', 'cancelled')`,
  ];
  const ticketWindowWhere: SQL[] = [
    eq(tickets.tenantId, params.tenantId),
    gte(tickets.createdAt, fromDate),
    lte(tickets.createdAt, toDate),
  ];
  if (params.locationIds?.length) {
    openTicketWhere.push(inArray(tickets.locationId, params.locationIds));
    ticketWindowWhere.push(inArray(tickets.locationId, params.locationIds));
  }

  const dutiesWhere: SQL[] = [
    eq(operationalDutyAssignments.tenantId, params.tenantId),
    gte(operationalDutyAssignments.assignmentDate, fromDate),
    lte(operationalDutyAssignments.assignmentDate, toDate),
  ];
  if (params.locationIds?.length) dutiesWhere.push(inArray(operationalDutyAssignments.locationId, params.locationIds));

  const [[openRow], [createdRow], [resolvedRow], [dutiesRow]] = await Promise.all([
    db.select({ c: count() }).from(tickets).where(and(...openTicketWhere)),
    db.select({ c: count() }).from(tickets).where(and(...ticketWindowWhere)),
    db
      .select({ c: count() })
      .from(tickets)
      .where(and(...ticketWindowWhere, gte(tickets.resolvedAt, fromDate), lte(tickets.resolvedAt, toDate))),
    db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`coalesce(sum(case when ${operationalDutyAssignments.status} = 'completed' then 1 else 0 end),0)::int`,
      })
      .from(operationalDutyAssignments)
      .where(and(...dutiesWhere)),
  ]);

  const total = Number(dutiesRow?.total ?? 0);
  const completed = Number(dutiesRow?.completed ?? 0);
  return {
    ticketsOpen: Number(openRow?.c ?? 0),
    ticketsCreatedInWindow: Number(createdRow?.c ?? 0),
    ticketsResolvedInWindow: Number(resolvedRow?.c ?? 0),
    dutyAssignmentsCompletedRate: total > 0 ? completed / total : null,
  };
}

async function loadShiftHandover(params: OverviewReportsParams) {
  const shiftWhere: SQL[] = [
    eq(shiftReports.tenantId, params.tenantId),
    gte(shiftReports.reportDate, params.from),
    lte(shiftReports.reportDate, params.to),
    ...buildLocationClause(params.locationIds),
  ];

  const [[submittedRow], [acknowledgedReportsRow]] = await Promise.all([
    db.select({ c: count() }).from(shiftReports).where(and(...shiftWhere)),
    db
      .select({ c: sql<number>`count(distinct ${shiftReportAcknowledgments.shiftReportId})::int` })
      .from(shiftReportAcknowledgments)
      .innerJoin(shiftReports, eq(shiftReports.id, shiftReportAcknowledgments.shiftReportId))
      .where(and(...shiftWhere)),
  ]);

  const reportsSubmitted = Number(submittedRow?.c ?? 0);
  const reportsAcknowledged = Number(acknowledgedReportsRow?.c ?? 0);
  return {
    reportsSubmitted,
    reportsAcknowledged,
    acknowledgmentRate: reportsSubmitted > 0 ? reportsAcknowledged / reportsSubmitted : null,
  };
}

async function loadCompliance(params: OverviewReportsParams) {
  const { fromDate, toDate } = parseDayRange(params.from, params.to);
  const [row] = await db
    .select({ c: count() })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.tenantId, params.tenantId),
        gte(auditLogs.createdAt, fromDate),
        lte(auditLogs.createdAt, toDate),
      ),
    );
  return { auditEventsInWindow: Number(row?.c ?? 0) };
}

function omittedReasonMap(access: SectionAccess): string[] {
  const notes: string[] = [];
  if (!access.clinical) notes.push("clinical:forbidden");
  if (!access.compliance) notes.push("compliance:forbidden");
  return notes;
}

export async function fetchOverviewReports(params: OverviewReportsParams & { access: SectionAccess }) {
  const incidents = params.access.incidents ? await loadIncidents(params) : null;
  // Clinical tables were dropped; keep the payload key for client shape compatibility.
  const clinical = null;
  const operations = params.access.operations ? await loadOperations(params) : null;
  const shiftHandover = params.access.operations ? await loadShiftHandover(params) : null;
  const compliance = params.access.compliance ? await loadCompliance(params) : null;

  const notes = omittedReasonMap(params.access);
  return {
    meta: {
      from: params.from,
      to: params.to,
      generatedAt: new Date().toISOString(),
      locationIds: params.locationIds ?? [],
      partial: false,
      notes,
      omitted: {
        incidents: params.access.incidents ? null : "forbidden",
        clinical: params.access.clinical ? null : "forbidden",
        operations: params.access.operations ? null : "forbidden",
        compliance: params.access.compliance ? null : "forbidden",
      },
    },
    incidents,
    clinical,
    operations,
    shiftHandover,
    compliance,
  };
}

export function parseOverviewReportsQuery(q: Record<string, unknown>): Omit<OverviewReportsParams, "tenantId"> {
  const from = typeof q.from === "string" ? q.from : "";
  const to = typeof q.to === "string" ? q.to : "";
  if (!from || !to) {
    throw new Error("Query parameters `from` and `to` (YYYY-MM-DD) are required.");
  }
  return {
    from,
    to,
    locationIds: splitMulti(q.locationIds ?? q.locationId),
  };
}
