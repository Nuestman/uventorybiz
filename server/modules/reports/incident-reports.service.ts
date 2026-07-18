import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../config/db";
import {
  careLocations,
  companies,
  employees,
  incidentReports,
} from "@shared/schema";

export type IncidentReportsGroupBy = "day" | "week" | "month";

export type IncidentReportsParams = {
  tenantId: string;
  from: string;
  to: string;
  groupBy: IncidentReportsGroupBy;
  locationIds?: string[];
  companyIds?: string[];
  companyTypes?: string[];
  severities?: string[];
  incidentTypes?: string[];
  statuses?: string[];
  comparePriorPeriod?: boolean;
  includeDetail?: boolean;
  detailPage?: number;
  detailPageSize?: number;
};

const UNKNOWN_COMPANY = "__unknown__";
const UNKNOWN_LOCATION = "__unknown_location__";

const sqlUnknownCompanyId = sql.raw(`'${UNKNOWN_COMPANY}'`);
const sqlUnknownLocationId = sql.raw(`'${UNKNOWN_LOCATION}'`);

function sqlCompanyBucketId(): SQL {
  return sql`COALESCE(${companies.id}, ${sqlUnknownCompanyId})`;
}

function sqlIncidentLocationBucketId(): SQL {
  return sql`COALESCE(${incidentReports.locationId}, ${sqlUnknownLocationId})`;
}

function parseDayRange(from: string, to: string): { fromDate: Date; toDate: Date } {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);
  return { fromDate, toDate };
}

function incidentDateTruncExpr(grain: IncidentReportsGroupBy): SQL {
  const unit = grain === "day" ? "day" : grain === "week" ? "week" : "month";
  return sql`date_trunc(${sql.raw(`'${unit}'`)}, ${incidentReports.incidentDate})`;
}

function incidentPeriodKeyExpr(truncExpr: SQL, grain: IncidentReportsGroupBy): SQL<string> {
  if (grain === "month") {
    return sql<string>`to_char(${truncExpr}, 'YYYY-MM')`;
  }
  return sql<string>`to_char(${truncExpr}, 'YYYY-MM-DD')`;
}

function buildCompanyFilters(params: IncidentReportsParams): SQL[] {
  const clauses: SQL[] = [];
  if (params.companyIds?.length) {
    clauses.push(
      sql`${sqlCompanyBucketId()} IN (${sql.join(
        params.companyIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    );
  }
  if (params.companyTypes?.length) {
    clauses.push(inArray(companies.companyType, params.companyTypes));
  }
  return clauses;
}

function buildIncidentReportFilters(params: IncidentReportsParams, fromDate: Date, toDate: Date): SQL[] {
  const clauses: SQL[] = [
    eq(incidentReports.tenantId, params.tenantId),
    gte(incidentReports.incidentDate, fromDate),
    lte(incidentReports.incidentDate, toDate),
  ];
  if (params.locationIds?.length) {
    clauses.push(inArray(incidentReports.locationId, params.locationIds));
  }
  if (params.severities?.length) {
    clauses.push(inArray(incidentReports.severity, params.severities));
  }
  if (params.incidentTypes?.length) {
    clauses.push(inArray(incidentReports.incidentType, params.incidentTypes));
  }
  if (params.statuses?.length) {
    clauses.push(inArray(incidentReports.status, params.statuses));
  }
  return clauses;
}

/** Closed pipeline states (case-insensitive in SQL). */
function sqlIncidentIsClosed(): SQL {
  return sql`lower(trim(coalesce(${incidentReports.status}, ''))) IN ('closed', 'resolved')`;
}

/** Operational incidents — excludes drills/simulations. */
function sqlIncidentIsReal(): SQL {
  return sql`coalesce(${incidentReports.isDrillOrSimulation}, false) = false`;
}

/** Severe bucket for headline KPI (production vocabulary). */
function sqlIncidentIsSevere(): SQL {
  return sql`lower(trim(coalesce(${incidentReports.severity}, ''))) IN (
    'catastrophic', 'major', 'critical', 'high'
  )`;
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

type IncidentKpiRow = {
  totalIncidents: number;
  realIncidents: number;
  drillOrSimulationIncidents: number;
  openIncidents: number;
  closedIncidents: number;
  severeIncidents: number;
  incidentsWithAmbulance: number;
  detainedAtFapCount: number;
  treatedOnSiteCount: number;
};

async function fetchIncidentKpis(
  params: IncidentReportsParams,
  fromDate: Date,
  toDate: Date,
): Promise<IncidentKpiRow> {
  const baseWhere = and(
    ...buildIncidentReportFilters(params, fromDate, toDate),
    ...buildCompanyFilters(params),
  );
  const [row] = await db
    .select({
      totalIncidents: count(),
      realIncidents:
        sql<number>`COALESCE(sum(CASE WHEN ${sqlIncidentIsReal()} THEN 1 ELSE 0 END), 0)::int`,
      drillOrSimulationIncidents:
        sql<number>`COALESCE(sum(CASE WHEN ${incidentReports.isDrillOrSimulation} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
      openIncidents:
        sql<number>`COALESCE(sum(CASE WHEN ${sqlIncidentIsReal()} AND NOT ${sqlIncidentIsClosed()} THEN 1 ELSE 0 END), 0)::int`,
      closedIncidents:
        sql<number>`COALESCE(sum(CASE WHEN ${sqlIncidentIsReal()} AND ${sqlIncidentIsClosed()} THEN 1 ELSE 0 END), 0)::int`,
      severeIncidents:
        sql<number>`COALESCE(sum(CASE WHEN ${sqlIncidentIsReal()} AND ${sqlIncidentIsSevere()} THEN 1 ELSE 0 END), 0)::int`,
      incidentsWithAmbulance:
        sql<number>`COALESCE(sum(CASE WHEN ${sqlIncidentIsReal()} AND ${incidentReports.ambulanceUsed} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
      detainedAtFapCount:
        sql<number>`COALESCE(sum(CASE WHEN ${sqlIncidentIsReal()} AND ${incidentReports.detainedAtFap} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
      treatedOnSiteCount:
        sql<number>`COALESCE(sum(CASE WHEN ${sqlIncidentIsReal()} AND ${incidentReports.treatedOnSite} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(incidentReports)
    .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
    .leftJoin(companies, eq(companies.id, employees.companyId))
    .where(baseWhere);

  return {
    totalIncidents: Number(row?.totalIncidents ?? 0),
    realIncidents: Number(row?.realIncidents ?? 0),
    drillOrSimulationIncidents: Number(row?.drillOrSimulationIncidents ?? 0),
    openIncidents: Number(row?.openIncidents ?? 0),
    closedIncidents: Number(row?.closedIncidents ?? 0),
    severeIncidents: Number(row?.severeIncidents ?? 0),
    incidentsWithAmbulance: Number(row?.incidentsWithAmbulance ?? 0),
    detainedAtFapCount: Number(row?.detainedAtFapCount ?? 0),
    treatedOnSiteCount: Number(row?.treatedOnSiteCount ?? 0),
  };
}

function shapeKpiPayload(row: IncidentKpiRow) {
  const real = row.realIncidents;
  return {
    totalIncidents: row.totalIncidents,
    realIncidents: real,
    drillOrSimulationIncidents: row.drillOrSimulationIncidents,
    openIncidents: row.openIncidents,
    closedIncidents: row.closedIncidents,
    severeIncidents: row.severeIncidents,
    severeShare: real > 0 ? row.severeIncidents / real : null,
    incidentsWithAmbulance: row.incidentsWithAmbulance,
    ambulanceRate: real > 0 ? row.incidentsWithAmbulance / real : null,
    detainedAtFapCount: row.detainedAtFapCount,
    detainedAtFapRate: real > 0 ? row.detainedAtFapCount / real : null,
    treatedOnSiteCount: row.treatedOnSiteCount,
    treatedOnSiteRate: real > 0 ? row.treatedOnSiteCount / real : null,
  };
}

export async function fetchIncidentReports(params: IncidentReportsParams) {
  const { fromDate, toDate } = parseDayRange(params.from, params.to);
  const incidentWhere = and(...buildIncidentReportFilters(params, fromDate, toDate), ...buildCompanyFilters(params));

  const truncExpr = incidentDateTruncExpr(params.groupBy);
  const periodKeyExpr = incidentPeriodKeyExpr(truncExpr, params.groupBy);
  const companyBucket = sqlCompanyBucketId();
  const locationBucket = sqlIncidentLocationBucketId();

  const priorRange = params.comparePriorPeriod ? computePriorInclusiveRange(params.from, params.to) : null;
  let kpisPriorPeriod: ReturnType<typeof shapeKpiPayload> | null = null;
  let priorPeriodMeta: { from: string; to: string } | null = null;

  if (priorRange) {
    priorPeriodMeta = { from: priorRange.from, to: priorRange.to };
    const pFrom = new Date(`${priorRange.from}T00:00:00.000Z`);
    const pTo = new Date(`${priorRange.to}T23:59:59.999Z`);
    const priorRow = await fetchIncidentKpis(params, pFrom, pTo);
    kpisPriorPeriod = shapeKpiPayload(priorRow);
  }

  const [
    kpiRow,
    periodRows,
    periodCompanyRows,
    severityRows,
    typeRows,
    statusRows,
    typeSeverityRows,
    byCompanyRows,
    companyByLocationRows,
    topCareLocationRows,
    topSiteRows,
  ] = await Promise.all([
    fetchIncidentKpis(params, fromDate, toDate),
    db
      .select({
        period: periodKeyExpr,
        total: sql<number>`count(*)::int`,
      })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(incidentWhere)
      .groupBy(periodKeyExpr)
      .orderBy(asc(periodKeyExpr)),

    db
      .select({
        period: periodKeyExpr,
        companyId: sql<string>`${companyBucket}`,
        companyName: sql<string>`MIN(COALESCE(${companies.name}, 'Unknown company'))`,
        companyType: sql<string | null>`MIN(${companies.companyType})`,
        cnt: sql<number>`count(*)::int`,
      })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(incidentWhere)
      .groupBy(periodKeyExpr, companyBucket)
      .orderBy(asc(periodKeyExpr)),

    db
      .select({
        severity: incidentReports.severity,
        cnt: sql<number>`count(*)::int`,
      })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(incidentWhere)
      .groupBy(incidentReports.severity),

    db
      .select({
        incidentType: incidentReports.incidentType,
        cnt: sql<number>`count(*)::int`,
      })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(incidentWhere)
      .groupBy(incidentReports.incidentType),

    db
      .select({
        status: incidentReports.status,
        cnt: sql<number>`count(*)::int`,
      })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(incidentWhere)
      .groupBy(incidentReports.status),

    db
      .select({
        incidentType: incidentReports.incidentType,
        severity: incidentReports.severity,
        cnt: sql<number>`count(*)::int`,
      })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(incidentWhere)
      .groupBy(incidentReports.incidentType, incidentReports.severity),

    db
      .select({
        companyId: sql<string>`${companyBucket}`,
        companyName: sql<string>`MIN(COALESCE(${companies.name}, 'Unknown company'))`,
        companyType: sql<string | null>`MIN(${companies.companyType})`,
        incidentCount: sql<number>`count(*)::int`,
        openIncidents:
          sql<number>`COALESCE(sum(CASE WHEN ${sqlIncidentIsClosed()} THEN 0 ELSE 1 END), 0)::int`,
        closedIncidents:
          sql<number>`COALESCE(sum(CASE WHEN ${sqlIncidentIsClosed()} THEN 1 ELSE 0 END), 0)::int`,
        incidentsWithAmbulance:
          sql<number>`COALESCE(sum(CASE WHEN ${incidentReports.ambulanceUsed} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
        detainedAtFapCount:
          sql<number>`COALESCE(sum(CASE WHEN ${incidentReports.detainedAtFap} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
        treatedOnSiteCount:
          sql<number>`COALESCE(sum(CASE WHEN ${incidentReports.treatedOnSite} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(incidentWhere)
      .groupBy(companyBucket),

    db
      .select({
        companyId: sql<string>`${companyBucket}`,
        companyName: sql<string>`MIN(COALESCE(${companies.name}, 'Unknown company'))`,
        companyType: sql<string | null>`MIN(${companies.companyType})`,
        locationId: sql<string>`${locationBucket}`,
        locationName: sql<string>`MIN(COALESCE(${careLocations.locationName}, 'Unknown location'))`,
        count: sql<number>`count(*)::int`,
      })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .leftJoin(careLocations, eq(careLocations.id, incidentReports.locationId))
      .where(incidentWhere)
      .groupBy(companyBucket, locationBucket),

    db
      .select({
        locationId: sql<string>`${locationBucket}`,
        locationName: sql<string>`MIN(COALESCE(${careLocations.locationName}, 'Unknown location'))`,
        count: sql<number>`count(*)::int`,
        detainedCount:
          sql<number>`COALESCE(sum(CASE WHEN ${incidentReports.detainedAtFap} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .leftJoin(careLocations, eq(careLocations.id, incidentReports.locationId))
      .where(incidentWhere)
      .groupBy(locationBucket)
      .orderBy(desc(sql<number>`count(*)::int`))
      .limit(15),

    db
      .select({
        siteLabel: sql<string>`trim(coalesce(${incidentReports.incidentLocation}, ''))`,
        count: sql<number>`count(*)::int`,
      })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(incidentWhere)
      .groupBy(sql`trim(coalesce(${incidentReports.incidentLocation}, ''))`)
      .orderBy(desc(sql<number>`count(*)::int`))
      .limit(25),
  ]);

  const kpis = shapeKpiPayload(kpiRow);

  const incidentsOverTime = periodRows.map((r) => ({
    period: String(r.period ?? ""),
    total: Number(r.total ?? 0),
  }));

  const incidentsOverTimeByCompany = periodCompanyRows.map((r) => ({
    period: String(r.period ?? ""),
    companyId: String(r.companyId ?? ""),
    companyName: String(r.companyName ?? ""),
    companyType: r.companyType ?? null,
    count: Number(r.cnt ?? 0),
  }));

  const severityMix = severityRows
    .map((r) => ({
      severity: (r.severity && String(r.severity).trim()) ? String(r.severity) : "Unknown",
      count: Number(r.cnt ?? 0),
    }))
    .sort((a, b) => b.count - a.count);

  const incidentTypeMix = typeRows
    .map((r) => ({
      incidentType: (r.incidentType && String(r.incidentType).trim()) ? String(r.incidentType) : "Unknown",
      count: Number(r.cnt ?? 0),
    }))
    .sort((a, b) => b.count - a.count);

  const statusMix = statusRows
    .map((r) => ({
      status: (r.status && String(r.status).trim()) ? String(r.status) : "Unknown",
      count: Number(r.cnt ?? 0),
    }))
    .sort((a, b) => b.count - a.count);

  const typeBySeverity = typeSeverityRows
    .map((r) => ({
      incidentType: (r.incidentType && String(r.incidentType).trim()) ? String(r.incidentType) : "Unknown",
      severity: (r.severity && String(r.severity).trim()) ? String(r.severity) : "Unknown",
      count: Number(r.cnt ?? 0),
    }))
    .sort((a, b) => b.count - a.count);

  const byCompany = byCompanyRows.map((r) => {
    const ic = Number(r.incidentCount ?? 0);
    return {
      companyId: r.companyId === UNKNOWN_COMPANY ? null : r.companyId,
      companyName: String(r.companyName ?? "Unknown company"),
      companyType: r.companyType ?? null,
      incidentCount: ic,
      openIncidents: Number(r.openIncidents ?? 0),
      closedIncidents: Number(r.closedIncidents ?? 0),
      incidentsWithAmbulance: Number(r.incidentsWithAmbulance ?? 0),
      ambulanceRate: ic > 0 ? Number(r.incidentsWithAmbulance ?? 0) / ic : null,
      detainedAtFapCount: Number(r.detainedAtFapCount ?? 0),
      treatedOnSiteCount: Number(r.treatedOnSiteCount ?? 0),
    };
  });

  const companyByLocation = companyByLocationRows
    .map((r) => ({
      companyId: r.companyId === UNKNOWN_COMPANY ? null : r.companyId,
      companyName: String(r.companyName ?? "Unknown company"),
      companyType: r.companyType ?? null,
      locationId: r.locationId === UNKNOWN_LOCATION ? null : r.locationId,
      locationName: String(r.locationName ?? "Unknown location"),
      count: Number(r.count ?? 0),
    }))
    .sort(
      (a, b) =>
        a.companyName.localeCompare(b.companyName) || a.locationName.localeCompare(b.locationName),
    );

  const topCareLocations = topCareLocationRows.map((r) => ({
    locationId: r.locationId === UNKNOWN_LOCATION ? null : r.locationId,
    locationName: String(r.locationName ?? "Unknown location"),
    count: Number(r.count ?? 0),
    detainedCount: Number(r.detainedCount ?? 0),
    detainedRate: Number(r.count ?? 0) > 0 ? Number(r.detainedCount ?? 0) / Number(r.count ?? 0) : null,
  }));

  const topIncidentSites = topSiteRows
    .filter((r) => String(r.siteLabel ?? "").length > 0)
    .map((r) => ({
      siteLabel: String(r.siteLabel),
      count: Number(r.count ?? 0),
    }));

  const incidentDayTrunc = sql`date_trunc('day', ${incidentReports.incidentDate})`;
  const incidentDayKeyExpr = sql<string>`to_char(${incidentDayTrunc}, 'YYYY-MM-DD')`;

  const incidentCaseRows = await db
    .select({
      day: incidentDayKeyExpr,
      locationId: sql<string>`${locationBucket}`,
      cnt: sql<number>`count(*)::int`,
    })
    .from(incidentReports)
    .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
    .leftJoin(companies, eq(companies.id, employees.companyId))
    .leftJoin(careLocations, eq(careLocations.id, incidentReports.locationId))
    .where(incidentWhere)
    .groupBy(incidentDayTrunc, locationBucket)
    .orderBy(asc(incidentDayTrunc));

  const cellMap = new Map<string, number>();
  for (const r of incidentCaseRows) {
    const day = String(r.day ?? "");
    const loc = String(r.locationId ?? UNKNOWN_LOCATION);
    const k = `${day}|${loc}`;
    cellMap.set(k, (cellMap.get(k) ?? 0) + Number(r.cnt ?? 0));
  }

  const allLocIds = new Set<string>();
  for (const key of cellMap.keys()) {
    const loc = key.split("|")[1];
    if (loc) allLocIds.add(loc);
  }
  const knownLocIds = [...allLocIds].filter((id) => id !== UNKNOWN_LOCATION);
  const locMetaRows =
    knownLocIds.length > 0
      ? await db
          .select({
            id: careLocations.id,
            name: careLocations.locationName,
          })
          .from(careLocations)
          .where(
            and(eq(careLocations.tenantId, params.tenantId), inArray(careLocations.id, knownLocIds)),
          )
      : [];
  const locNameById = new Map(locMetaRows.map((r) => [r.id, r.name ?? "Unknown location"]));

  const columnKeys = [...allLocIds].sort((a, b) => {
    if (a === UNKNOWN_LOCATION) return 1;
    if (b === UNKNOWN_LOCATION) return -1;
    const na = locNameById.get(a) ?? a;
    const nb = locNameById.get(b) ?? b;
    return na.localeCompare(nb);
  });

  const columns = columnKeys.map((key) => ({
    key,
    locationId: key === UNKNOWN_LOCATION ? null : key,
    locationName: key === UNKNOWN_LOCATION ? "Unknown location" : locNameById.get(key) ?? key,
  }));

  const dates = enumerateUtcDaysInclusive(params.from, params.to);
  const rows = dates.map((date) => {
    const cells = columnKeys.map((locKey) => cellMap.get(`${date}|${locKey}`) ?? 0);
    const rowTotal = cells.reduce((s, n) => s + n, 0);
    return { date, cells, rowTotal };
  });
  const columnTotals = columnKeys.map((locKey) =>
    dates.reduce((s, d) => s + (cellMap.get(`${d}|${locKey}`) ?? 0), 0),
  );
  const grandTotal = rows.reduce((s, r) => s + r.rowTotal, 0);

  const incidentsByDayByPost = {
    dates,
    columns,
    rows,
    columnTotals,
    grandTotal,
  };

  let detailPayload: {
    rows: Array<{
      incidentId: string;
      incidentDate: string;
      severity: string;
      incidentType: string;
      status: string | null;
      companyId: string | null;
      companyName: string;
      locationId: string | null;
      locationName: string;
      ambulanceUsed: boolean;
      detainedAtFap: boolean;
      treatedOnSite: boolean;
    }>;
    page: number;
    pageSize: number;
    totalCount: number;
  } | null = null;

  if (params.includeDetail) {
    const page = Math.max(1, params.detailPage ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.detailPageSize ?? 25));
    const offset = (page - 1) * pageSize;

    const detailRows = await db
      .select({
        incidentId: incidentReports.id,
        incidentDate: incidentReports.incidentDate,
        severity: incidentReports.severity,
        incidentType: incidentReports.incidentType,
        status: incidentReports.status,
        companyId: sql<string | null>`CASE WHEN ${companyBucket} = ${sqlUnknownCompanyId} THEN NULL ELSE ${companyBucket} END`,
        companyName: sql<string>`COALESCE(${companies.name}, 'Unknown company')`,
        locationId: sql<string | null>`CASE WHEN ${locationBucket} = ${sqlUnknownLocationId} THEN NULL ELSE ${locationBucket} END`,
        locationName: sql<string>`COALESCE(${careLocations.locationName}, 'Unknown location')`,
        ambulanceUsed: incidentReports.ambulanceUsed,
        detainedAtFap: incidentReports.detainedAtFap,
        treatedOnSite: incidentReports.treatedOnSite,
      })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .leftJoin(careLocations, eq(careLocations.id, incidentReports.locationId))
      .where(incidentWhere)
      .orderBy(desc(incidentReports.incidentDate))
      .limit(pageSize)
      .offset(offset);

    const [countRow] = await db
      .select({ c: count() })
      .from(incidentReports)
      .innerJoin(employees, eq(employees.id, incidentReports.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(incidentWhere);

    detailPayload = {
      rows: detailRows.map((r) => ({
        incidentId: r.incidentId,
        incidentDate: r.incidentDate instanceof Date ? r.incidentDate.toISOString() : String(r.incidentDate),
        severity: r.severity ?? "",
        incidentType: r.incidentType ?? "",
        status: r.status ?? null,
        companyId: r.companyId,
        companyName: r.companyName ?? "Unknown company",
        locationId: r.locationId,
        locationName: r.locationName ?? "Unknown location",
        ambulanceUsed: r.ambulanceUsed === true,
        detainedAtFap: r.detainedAtFap === true,
        treatedOnSite: r.treatedOnSite === true,
      })),
      page,
      pageSize,
      totalCount: Number(countRow?.c ?? 0),
    };
  }

  return {
    meta: {
      from: params.from,
      to: params.to,
      groupBy: params.groupBy,
      generatedAt: new Date().toISOString(),
      priorPeriod: priorPeriodMeta,
      filters: {
        locationIds: params.locationIds ?? [],
        companyIds: params.companyIds ?? [],
        companyTypes: params.companyTypes ?? [],
        severities: params.severities ?? [],
        incidentTypes: params.incidentTypes ?? [],
        statuses: params.statuses ?? [],
      },
    },
    kpis,
    kpisPriorPeriod,
    series: {
      incidentsOverTime,
      incidentsOverTimeByCompany,
      severityMix,
      incidentTypeMix,
      statusMix,
    },
    tables: {
      byCompany,
      companyByLocation,
      incidentsByDayByPost,
      topCareLocations,
      topIncidentSites,
      typeBySeverity,
    },
    detail: detailPayload,
  };
}

export function parseIncidentReportsQuery(q: Record<string, unknown>): Omit<IncidentReportsParams, "tenantId"> {
  const from = typeof q.from === "string" ? q.from : "";
  const to = typeof q.to === "string" ? q.to : "";
  if (!from || !to) {
    throw new Error("Query parameters `from` and `to` (YYYY-MM-DD) are required.");
  }
  const groupByRaw = typeof q.groupBy === "string" ? q.groupBy : "week";
  if (!["day", "week", "month"].includes(groupByRaw)) {
    throw new Error("`groupBy` must be day, week, or month.");
  }
  const groupBy = groupByRaw as IncidentReportsGroupBy;

  const splitMulti = (v: unknown): string[] | undefined => {
    if (v == null || v === "") return undefined;
    if (Array.isArray(v)) return v.map(String).filter(Boolean);
    const s = String(v);
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  };

  const parseBoolDefault = (v: unknown, defaultVal: boolean): boolean => {
    if (v === undefined || v === "") return defaultVal;
    const s = String(v).toLowerCase();
    if (["true", "1", "yes", "on"].includes(s)) return true;
    if (["false", "0", "no", "off"].includes(s)) return false;
    return defaultVal;
  };

  const parseIntClamped = (v: unknown, fallback: number, min: number, max: number): number => {
    const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
  };

  return {
    from,
    to,
    groupBy,
    locationIds: splitMulti(q.locationIds ?? q.locationId),
    companyIds: splitMulti(q.companyIds),
    companyTypes: splitMulti(q.companyTypes),
    severities: splitMulti(q.severities),
    incidentTypes: splitMulti(q.incidentTypes),
    statuses: splitMulti(q.statuses),
    comparePriorPeriod: parseBoolDefault(q.comparePriorPeriod, false),
    includeDetail: parseBoolDefault(q.includeDetail, false),
    detailPage: parseIntClamped(q.detailPage, 1, 1, 5000),
    detailPageSize: parseIntClamped(q.detailPageSize, 25, 1, 100),
  };
}
