import { and, asc, count, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "../../config/db";
import {
  careLocations,
  operationalDuties,
  operationalDutyAssignments,
  shiftReportLinks,
  shiftReports,
  ticketCategories,
  tickets,
} from "@shared/schema";
import { fetchShiftHandoverAckSummary, shiftReportsInRangeWhere } from "./shift-handover-ack-summary";

export type OperationsReportsGroupBy = "day" | "week" | "month";

export type OperationsReportsParams = {
  tenantId: string;
  from: string;
  to: string;
  groupBy: OperationsReportsGroupBy;
  locationIds?: string[];
  ticketCategoryIds?: string[];
  ticketStatuses?: string[];
  ticketPriorities?: string[];
  assigneeUserIds?: string[];
  requesterUserIds?: string[];
  dutyIds?: string[];
  dutyAssignmentStatuses?: string[];
  shifts?: string[];
  shiftReportShifts?: string[];
  onlyWithIssues?: boolean;
};

const UNKNOWN_CATEGORY = "__unknown_category__";

function parseDayRange(from: string, to: string): { fromDate: Date; toDate: Date } {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);
  return { fromDate, toDate };
}

function splitMulti(v: unknown): string[] | undefined {
  if (v == null || v === "") return undefined;
  if (Array.isArray(v)) return v.map(String).map((x) => x.trim()).filter(Boolean);
  return String(v)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseBool(v: unknown, defaultValue = false): boolean {
  if (v == null || v === "") return defaultValue;
  const s = String(v).toLowerCase();
  if (["1", "true", "yes", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return defaultValue;
}

function enumerateUtcDaysInclusive(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  let t = Date.UTC(fy, fm - 1, fd);
  const end = Date.UTC(ty, tm - 1, td);
  while (t <= end) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
    t += 86_400_000;
  }
  return out;
}

function computePriorInclusiveRange(fromIso: string, toIso: string): { from: string; to: string } | null {
  const days = enumerateUtcDaysInclusive(fromIso, toIso);
  const n = days.length;
  if (n === 0) return null;
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const startUtc = Date.UTC(fy, fm - 1, fd);
  const priorEndUtc = startUtc - 86_400_000;
  const priorStartUtc = priorEndUtc - (n - 1) * 86_400_000;
  const endD = new Date(priorEndUtc);
  const startD = new Date(priorStartUtc);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { from: fmt(startD), to: fmt(endD) };
}

function dateTruncExpr(grain: OperationsReportsGroupBy, column: any): SQL {
  const unit = grain === "day" ? "day" : grain === "week" ? "week" : "month";
  return sql`date_trunc(${sql.raw(`'${unit}'`)}, ${column})`;
}

function periodKeyExpr(truncExpr: SQL, grain: OperationsReportsGroupBy): SQL<string> {
  if (grain === "month") {
    return sql<string>`to_char(${truncExpr}, 'YYYY-MM')`;
  }
  return sql<string>`to_char(${truncExpr}, 'YYYY-MM-DD')`;
}

function buildTicketWhere(params: OperationsReportsParams, fromDate: Date, toDate: Date): SQL[] {
  const clauses: SQL[] = [
    eq(tickets.tenantId, params.tenantId),
    gte(tickets.createdAt, fromDate),
    lte(tickets.createdAt, toDate),
  ];
  if (params.locationIds?.length) clauses.push(inArray(tickets.locationId, params.locationIds));
  if (params.ticketCategoryIds?.length) clauses.push(inArray(tickets.categoryId, params.ticketCategoryIds));
  if (params.ticketStatuses?.length) clauses.push(inArray(tickets.status, params.ticketStatuses as any));
  if (params.ticketPriorities?.length) clauses.push(inArray(tickets.priority, params.ticketPriorities as any));
  if (params.assigneeUserIds?.length) clauses.push(inArray(tickets.assigneeUserId, params.assigneeUserIds));
  if (params.requesterUserIds?.length) clauses.push(inArray(tickets.requesterUserId, params.requesterUserIds));
  return clauses;
}

function buildTicketOpenWhere(params: OperationsReportsParams): SQL[] {
  const clauses: SQL[] = [
    eq(tickets.tenantId, params.tenantId),
    sql`${tickets.status} NOT IN ('resolved', 'closed', 'cancelled')`,
  ];
  if (params.locationIds?.length) clauses.push(inArray(tickets.locationId, params.locationIds));
  if (params.ticketCategoryIds?.length) clauses.push(inArray(tickets.categoryId, params.ticketCategoryIds));
  if (params.ticketStatuses?.length) clauses.push(inArray(tickets.status, params.ticketStatuses as any));
  if (params.ticketPriorities?.length) clauses.push(inArray(tickets.priority, params.ticketPriorities as any));
  if (params.assigneeUserIds?.length) clauses.push(inArray(tickets.assigneeUserId, params.assigneeUserIds));
  if (params.requesterUserIds?.length) clauses.push(inArray(tickets.requesterUserId, params.requesterUserIds));
  return clauses;
}

function buildDutyWhere(params: OperationsReportsParams, fromDate: Date, toDate: Date): SQL[] {
  const clauses: SQL[] = [
    eq(operationalDutyAssignments.tenantId, params.tenantId),
    gte(operationalDutyAssignments.assignmentDate, fromDate),
    lte(operationalDutyAssignments.assignmentDate, toDate),
  ];
  if (params.locationIds?.length) clauses.push(inArray(operationalDutyAssignments.locationId, params.locationIds));
  if (params.dutyIds?.length) clauses.push(inArray(operationalDutyAssignments.dutyId, params.dutyIds));
  if (params.dutyAssignmentStatuses?.length) {
    clauses.push(inArray(operationalDutyAssignments.status, params.dutyAssignmentStatuses));
  }
  if (params.shifts?.length) clauses.push(inArray(operationalDutyAssignments.shift, params.shifts));
  return clauses;
}

function hoursFromNow(ts: Date | null | undefined): number | null {
  if (!(ts instanceof Date)) return null;
  const ms = Date.now() - ts.getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return ms / 3_600_000;
}

function computeAgingBucket(hours: number): "0-24h" | "1-3d" | "3-7d" | "7d+" {
  if (hours < 24) return "0-24h";
  if (hours < 72) return "1-3d";
  if (hours < 168) return "3-7d";
  return "7d+";
}

export type OperationsReportsKpis = Awaited<ReturnType<typeof fetchOperationsReportsAggregates>>["kpis"];

async function fetchOperationsReportsAggregates(params: OperationsReportsParams) {
  const { fromDate, toDate } = parseDayRange(params.from, params.to);
  const ticketWhere = and(...buildTicketWhere(params, fromDate, toDate));
  const ticketOpenWhere = and(...buildTicketOpenWhere(params));
  const dutyWhere = and(...buildDutyWhere(params, fromDate, toDate));
  const shiftWhere = shiftReportsInRangeWhere({
    tenantId: params.tenantId,
    from: params.from,
    to: params.to,
    locationIds: params.locationIds,
    shiftReportShifts: params.shiftReportShifts,
    onlyWithIssues: params.onlyWithIssues,
  });

  const ticketPeriod = periodKeyExpr(dateTruncExpr(params.groupBy, tickets.createdAt), params.groupBy);
  const dutyPeriod = periodKeyExpr(
    dateTruncExpr(params.groupBy, operationalDutyAssignments.assignmentDate),
    params.groupBy,
  );
  const shiftPeriod = periodKeyExpr(
    dateTruncExpr(params.groupBy, sql`${shiftReports.reportDate}::timestamp`),
    params.groupBy,
  );

  const unknownCategoryId = sql.raw(`'${UNKNOWN_CATEGORY}'`);

  const [
    ticketCreatedRows,
    ticketResolvedRows,
    ticketClosedRows,
    ticketStatusRows,
    ticketPriorityRows,
    ticketCategoryRows,
    openTicketRows,
    dutyKpiRows,
    dutyOverTimeRows,
    dutiesByLocationRows,
    shiftKpiRows,
    shiftOverTimeRows,
    shiftLinkRows,
    assigneeOpenRows,
    assigneeResolvedRows,
    dutiesByDutyRows,
    dutiesByCategoryRows,
    shiftAckSummary,
  ] = await Promise.all([
    db
      .select({
        period: ticketPeriod,
        cnt: sql<number>`count(*)::int`,
      })
      .from(tickets)
      .where(ticketWhere)
      .groupBy(ticketPeriod)
      .orderBy(asc(ticketPeriod)),
    db
      .select({ c: count() })
      .from(tickets)
      .where(and(ticketWhere, gte(tickets.resolvedAt, fromDate), lte(tickets.resolvedAt, toDate))),
    db
      .select({ c: count() })
      .from(tickets)
      .where(and(ticketWhere, gte(tickets.closedAt, fromDate), lte(tickets.closedAt, toDate))),
    db
      .select({
        status: tickets.status,
        cnt: sql<number>`count(*)::int`,
      })
      .from(tickets)
      .where(ticketWhere)
      .groupBy(tickets.status),
    db
      .select({
        priority: tickets.priority,
        cnt: sql<number>`count(*)::int`,
      })
      .from(tickets)
      .where(ticketWhere)
      .groupBy(tickets.priority),
    db
      .select({
        categoryId: sql<string>`COALESCE(${tickets.categoryId}, ${unknownCategoryId})`,
        categoryName: sql<string>`MIN(COALESCE(${ticketCategories.name}, 'Unknown category'))`,
        cnt: sql<number>`count(*)::int`,
      })
      .from(tickets)
      .leftJoin(ticketCategories, eq(ticketCategories.id, tickets.categoryId))
      .where(ticketWhere)
      .groupBy(sql`COALESCE(${tickets.categoryId}, ${unknownCategoryId})`)
      .orderBy(desc(sql<number>`count(*)::int`)),
    db
      .select({
        updatedAt: tickets.updatedAt,
      })
      .from(tickets)
      .where(ticketOpenWhere),
    db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`coalesce(sum(case when ${operationalDutyAssignments.status} = 'completed' then 1 else 0 end),0)::int`,
        overdue: sql<number>`coalesce(sum(case when ${operationalDutyAssignments.status} = 'overdue' then 1 else 0 end),0)::int`,
      })
      .from(operationalDutyAssignments)
      .where(dutyWhere),
    db
      .select({
        period: dutyPeriod,
        total: sql<number>`count(*)::int`,
        completed: sql<number>`coalesce(sum(case when ${operationalDutyAssignments.status} = 'completed' then 1 else 0 end),0)::int`,
      })
      .from(operationalDutyAssignments)
      .where(dutyWhere)
      .groupBy(dutyPeriod)
      .orderBy(asc(dutyPeriod)),
    db
      .select({
        locationId: operationalDutyAssignments.locationId,
        locationName: sql<string>`min(coalesce(${careLocations.locationName}, 'Unknown location'))`,
        total: sql<number>`count(*)::int`,
        completed: sql<number>`coalesce(sum(case when ${operationalDutyAssignments.status} = 'completed' then 1 else 0 end),0)::int`,
      })
      .from(operationalDutyAssignments)
      .leftJoin(careLocations, eq(careLocations.id, operationalDutyAssignments.locationId))
      .where(dutyWhere)
      .groupBy(operationalDutyAssignments.locationId)
      .orderBy(desc(sql<number>`count(*)::int`)),
    db
      .select({
        submitted: sql<number>`count(*)::int`,
        withIssues: sql<number>`coalesce(sum(case when ${shiftReports.hasIssues} is true then 1 else 0 end),0)::int`,
      })
      .from(shiftReports)
      .where(shiftWhere),
    db
      .select({
        period: shiftPeriod,
        submitted: sql<number>`count(*)::int`,
      })
      .from(shiftReports)
      .where(shiftWhere)
      .groupBy(shiftPeriod)
      .orderBy(asc(shiftPeriod)),
    db
      .select({
        linkedType: shiftReportLinks.linkedType,
        cnt: sql<number>`count(*)::int`,
      })
      .from(shiftReportLinks)
      .innerJoin(shiftReports, eq(shiftReports.id, shiftReportLinks.shiftReportId))
      .where(and(shiftWhere, eq(shiftReportLinks.tenantId, params.tenantId)))
      .groupBy(shiftReportLinks.linkedType),
    db
      .select({
        assigneeUserId: tickets.assigneeUserId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(tickets)
      .where(ticketOpenWhere)
      .groupBy(tickets.assigneeUserId),
    db
      .select({
        assigneeUserId: tickets.assigneeUserId,
        cnt: sql<number>`count(*)::int`,
      })
      .from(tickets)
      .where(and(ticketWhere, gte(tickets.resolvedAt, fromDate), lte(tickets.resolvedAt, toDate)))
      .groupBy(tickets.assigneeUserId),
    db
      .select({
        dutyId: operationalDutyAssignments.dutyId,
        dutyTitle: sql<string>`min(${operationalDuties.title})`,
        dutyCategory: sql<string>`min(${operationalDuties.category})`,
        total: sql<number>`count(*)::int`,
        completed: sql<number>`coalesce(sum(case when ${operationalDutyAssignments.status} = 'completed' then 1 else 0 end),0)::int`,
      })
      .from(operationalDutyAssignments)
      .innerJoin(operationalDuties, eq(operationalDuties.id, operationalDutyAssignments.dutyId))
      .where(and(dutyWhere, eq(operationalDuties.tenantId, params.tenantId)))
      .groupBy(operationalDutyAssignments.dutyId),
    db
      .select({
        category: operationalDuties.category,
        total: sql<number>`count(*)::int`,
        completed: sql<number>`coalesce(sum(case when ${operationalDutyAssignments.status} = 'completed' then 1 else 0 end),0)::int`,
      })
      .from(operationalDutyAssignments)
      .innerJoin(operationalDuties, eq(operationalDuties.id, operationalDutyAssignments.dutyId))
      .where(and(dutyWhere, eq(operationalDuties.tenantId, params.tenantId)))
      .groupBy(operationalDuties.category)
      .orderBy(desc(sql<number>`count(*)::int`)),
    fetchShiftHandoverAckSummary({
      tenantId: params.tenantId,
      from: params.from,
      to: params.to,
      locationIds: params.locationIds,
      shiftReportShifts: params.shiftReportShifts,
      onlyWithIssues: params.onlyWithIssues,
    }),
  ]);

  const [openTicketsCountRow] = await db.select({ c: count() }).from(tickets).where(ticketOpenWhere);
  const [ticketsCreatedCountRow] = await db.select({ c: count() }).from(tickets).where(ticketWhere);
  const [ticketResolvedCountRow] = ticketResolvedRows;
  const [ticketClosedCountRow] = ticketClosedRows;
  const [dutyKpisRow] = dutyKpiRows;
  const [shiftKpisRow] = shiftKpiRows;

  const ticketAgingBuckets: Record<"0-24h" | "1-3d" | "3-7d" | "7d+", number> = {
    "0-24h": 0,
    "1-3d": 0,
    "3-7d": 0,
    "7d+": 0,
  };
  let openAgesTotalHours = 0;
  for (const row of openTicketRows) {
    const h = hoursFromNow(row.updatedAt);
    if (h == null) continue;
    openAgesTotalHours += h;
    ticketAgingBuckets[computeAgingBucket(h)] += 1;
  }

  const ticketsOpen = Number(openTicketsCountRow?.c ?? 0);
  const ticketsCreated = Number(ticketsCreatedCountRow?.c ?? 0);
  const ticketsResolved = Number(ticketResolvedCountRow?.c ?? 0);
  const ticketsClosed = Number(ticketClosedCountRow?.c ?? 0);
  const dutyAssignmentsTotal = Number(dutyKpisRow?.total ?? 0);
  const dutyAssignmentsCompleted = Number(dutyKpisRow?.completed ?? 0);
  const dutyAssignmentsOverdue = Number(dutyKpisRow?.overdue ?? 0);
  const shiftReportsSubmitted = Number(shiftKpisRow?.submitted ?? 0);
  const shiftReportsWithIssues = Number(shiftKpisRow?.withIssues ?? 0);
  const shiftAckCount = shiftAckSummary.shiftReportAcknowledgmentCount;

  const assigneeMap = new Map<string | null, { open: number; resolvedInWindow: number }>();
  for (const r of assigneeOpenRows) {
    const id = r.assigneeUserId;
    assigneeMap.set(id, { open: Number(r.cnt ?? 0), resolvedInWindow: 0 });
  }
  for (const r of assigneeResolvedRows) {
    const id = r.assigneeUserId;
    const prev = assigneeMap.get(id) ?? { open: 0, resolvedInWindow: 0 };
    prev.resolvedInWindow += Number(r.cnt ?? 0);
    assigneeMap.set(id, prev);
  }
  const ticketsByAssignee = Array.from(assigneeMap.entries())
    .map(([assigneeUserId, v]) => ({
      assigneeUserId,
      open: v.open,
      resolvedInWindow: v.resolvedInWindow,
    }))
    .sort((a, b) => b.open - a.open || b.resolvedInWindow - a.resolvedInWindow)
    .slice(0, 50);

  return {
    meta: {
      from: params.from,
      to: params.to,
      groupBy: params.groupBy,
      generatedAt: new Date().toISOString(),
      filters: {
        locationIds: params.locationIds ?? [],
        ticketCategoryIds: params.ticketCategoryIds ?? [],
        ticketStatuses: params.ticketStatuses ?? [],
        ticketPriorities: params.ticketPriorities ?? [],
        assigneeUserIds: params.assigneeUserIds ?? [],
        requesterUserIds: params.requesterUserIds ?? [],
        dutyIds: params.dutyIds ?? [],
        dutyAssignmentStatuses: params.dutyAssignmentStatuses ?? [],
        shifts: params.shifts ?? [],
        shiftReportShifts: params.shiftReportShifts ?? [],
        onlyWithIssues: Boolean(params.onlyWithIssues),
      },
    },
    kpis: {
      ticketsOpen,
      ticketsCreated,
      ticketsResolved,
      ticketsClosed,
      meanOpenTicketAgeHours: ticketsOpen > 0 ? openAgesTotalHours / ticketsOpen : null,
      dutyAssignmentsTotal,
      dutyAssignmentsCompleted,
      dutyAssignmentsOverdue,
      dutyCompletionRate: dutyAssignmentsTotal > 0 ? dutyAssignmentsCompleted / dutyAssignmentsTotal : null,
      shiftReportsSubmitted,
      shiftReportsWithIssues,
      shiftReportsWithIssuesRate: shiftReportsSubmitted > 0 ? shiftReportsWithIssues / shiftReportsSubmitted : null,
      shiftReportAcknowledgmentCount: shiftAckCount,
      shiftReportAckRate: shiftReportsSubmitted > 0 ? shiftAckCount / shiftReportsSubmitted : null,
    },
    series: {
      ticketsOverTime: ticketCreatedRows.map((r) => ({
        period: String(r.period ?? ""),
        total: Number(r.cnt ?? 0),
      })),
      dutiesOverTime: dutyOverTimeRows.map((r) => ({
        period: String(r.period ?? ""),
        total: Number(r.total ?? 0),
        completed: Number(r.completed ?? 0),
      })),
      shiftReportsOverTime: shiftOverTimeRows.map((r) => ({
        period: String(r.period ?? ""),
        total: Number(r.submitted ?? 0),
      })),
    },
    tables: {
      ticketsByStatus: ticketStatusRows
        .map((r) => ({ status: String(r.status ?? "unknown"), count: Number(r.cnt ?? 0) }))
        .sort((a, b) => b.count - a.count),
      ticketsByPriority: ticketPriorityRows
        .map((r) => ({ priority: String(r.priority ?? "unknown"), count: Number(r.cnt ?? 0) }))
        .sort((a, b) => b.count - a.count),
      ticketsByCategory: ticketCategoryRows.map((r) => ({
        categoryId: r.categoryId === UNKNOWN_CATEGORY ? null : String(r.categoryId),
        categoryName: String(r.categoryName ?? "Unknown category"),
        count: Number(r.cnt ?? 0),
      })),
      ticketsAgingBuckets: (["0-24h", "1-3d", "3-7d", "7d+"] as const).map((bucket) => ({
        bucket,
        count: ticketAgingBuckets[bucket],
      })),
      dutiesByLocation: dutiesByLocationRows.map((r) => {
        const total = Number(r.total ?? 0);
        const completed = Number(r.completed ?? 0);
        return {
          locationId: r.locationId ?? null,
          locationName: String(r.locationName ?? "Unknown location"),
          total,
          completed,
          completionRate: total > 0 ? completed / total : null,
        };
      }),
      shiftReportLinkCounts: shiftLinkRows
        .map((r) => ({
          linkedType: String(r.linkedType ?? "unknown").toLowerCase(),
          count: Number(r.cnt ?? 0),
        }))
        .sort((a, b) => b.count - a.count),
      ticketsByAssignee,
      dutiesByDuty: dutiesByDutyRows
        .map((r) => {
          const total = Number(r.total ?? 0);
          const completed = Number(r.completed ?? 0);
          return {
            dutyId: String(r.dutyId),
            dutyTitle: String(r.dutyTitle ?? ""),
            dutyCategory: String(r.dutyCategory ?? ""),
            total,
            completed,
            completionRate: total > 0 ? completed / total : null,
          };
        })
        .sort((a, b) => b.total - a.total),
      dutiesByCategory: dutiesByCategoryRows.map((r) => {
        const total = Number(r.total ?? 0);
        const completed = Number(r.completed ?? 0);
        return {
          category: String(r.category ?? "unknown"),
          total,
          completed,
          completionRate: total > 0 ? completed / total : null,
        };
      }),
    },
  };
}

export type ParsedOperationsReportsQuery = Omit<OperationsReportsParams, "tenantId"> & {
  comparePriorPeriod: boolean;
};

export async function fetchOperationsReports(
  input: OperationsReportsParams & { comparePriorPeriod?: boolean },
) {
  const { comparePriorPeriod, ...params } = input;
  const main = await fetchOperationsReportsAggregates(params);
  if (!comparePriorPeriod) {
    return { ...main, kpisPriorPeriod: null as OperationsReportsKpis | null };
  }
  const pr = computePriorInclusiveRange(params.from, params.to);
  if (!pr) {
    return { ...main, kpisPriorPeriod: null as OperationsReportsKpis | null };
  }
  const prior = await fetchOperationsReportsAggregates({ ...params, from: pr.from, to: pr.to });
  return {
    ...main,
    meta: {
      ...main.meta,
      priorPeriod: pr,
    },
    kpisPriorPeriod: prior.kpis,
  };
}

export function parseOperationsReportsQuery(q: Record<string, unknown>): ParsedOperationsReportsQuery {
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
    groupBy: groupByRaw as OperationsReportsGroupBy,
    locationIds: splitMulti(q.locationIds ?? q.locationId),
    ticketCategoryIds: splitMulti(q.ticketCategoryIds),
    ticketStatuses: splitMulti(q.ticketStatuses),
    ticketPriorities: splitMulti(q.ticketPriorities),
    assigneeUserIds: splitMulti(q.assigneeUserIds),
    requesterUserIds: splitMulti(q.requesterUserIds),
    dutyIds: splitMulti(q.dutyIds),
    dutyAssignmentStatuses: splitMulti(q.dutyAssignmentStatuses),
    shifts: splitMulti(q.shifts),
    shiftReportShifts: splitMulti(q.shiftReportShifts),
    onlyWithIssues: parseBool(q.onlyWithIssues, false),
    comparePriorPeriod: parseBool(q.comparePriorPeriod, false),
  };
}
