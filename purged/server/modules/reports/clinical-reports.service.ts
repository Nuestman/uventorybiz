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
import { alias } from "drizzle-orm/pg-core";
import {
  careLocations,
  companies,
  employees,
  incidentReports,
  medicalVisits,
  patients,
  triage,
  users,
} from "@shared/schema";
import { pivotTriageAcuityOverTime } from "./triage-acuity-pivot";

export type ClinicalReportsGroupBy = "day" | "week" | "month";

export type ClinicalReportsParams = {
  tenantId: string;
  from: string;
  to: string;
  groupBy: ClinicalReportsGroupBy;
  locationIds?: string[];
  visitTypes?: string[];
  dispositions?: string[];
  visitStatus?: string[];
  /** Filter triage rows by SATS acuity (`triage.acuity`). */
  triageAcuities?: string[];
  companyIds?: string[];
  companyTypes?: string[];
  /**
   * When false, occupational incident_report rows are excluded from **incidents per post** and from the **cases per
   * post by day** matrix merge (visits-only). KPI visit↔incident overlap still uses incidents for the overlap metric.
   * Default true when the query param is omitted (backward compatible).
   */
  includeIncidents?: boolean;
  /** Paginated visit-level rows (no patient identifiers). Default off for performance. */
  includeDetail?: boolean;
  detailPage?: number;
  detailPageSize?: number;
  /** Same KPI definitions as the primary window, for the contiguous prior period of equal calendar length. */
  comparePriorPeriod?: boolean;
};

const UNKNOWN_COMPANY = "__unknown__";
const UNKNOWN_LOCATION = "__unknown_location__";

type AmbulanceByClinicVisitRow = {
  locationId: string;
  locationName: string;
  /** All medical visits at this post in the window (aligns with cases matrix “visit” side). */
  visitCaseCount: number;
  visitTransfers: number;
  visitAmbulanceOnTransfers: number;
};
type AmbulanceByClinicIncidentRow = {
  locationId: string;
  locationName: string;
  incidentCount: number;
  incidentsWithAmbulance: number;
};

/** Literal SQL for unknown company—must match in SELECT and GROUP BY (avoid PG 42803). */
const sqlUnknownCompanyId = sql.raw(`'${UNKNOWN_COMPANY}'`);
const sqlUnknownLocationId = sql.raw(`'${UNKNOWN_LOCATION}'`);

/** Single reusable bucket key: coalesce(companies.id, '__unknown__') */
function sqlCompanyBucketId(): SQL {
  return sql`COALESCE(${companies.id}, ${sqlUnknownCompanyId})`;
}

function parseDayRange(from: string, to: string): { fromDate: Date; toDate: Date } {
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);
  return { fromDate, toDate };
}

/** Matches server-side rule in disposition-transfer.ts */
function transferDispositionCondition(): SQL {
  return sql`(
    ${medicalVisits.disposition} IN ('transferred_to_hospital', 'transferred_to_hospital_other')
    OR lower(cast(${medicalVisits.disposition} as text)) LIKE '%transfer%'
  )`;
}

/** Ambulance usage on clinical reports counts only visits with a hospital-transfer disposition (visit form parity). */
function ambulanceOnTransferVisitCondition(): SQL {
  return sql`(${transferDispositionCondition()}) AND (${medicalVisits.ambulanceUsed} IS TRUE)`;
}

/** Aligns with isReturnToWorkDisposition() in disposition-transfer.ts */
function returnToWorkDispositionCondition(): SQL {
  return sql`lower(trim(cast(${medicalVisits.disposition} as text))) = 'return_to_work'`;
}

function visitDateTruncExpr(grain: ClinicalReportsGroupBy) {
  const unit = grain === "day" ? "day" : grain === "week" ? "week" : "month";
  return sql`date_trunc(${sql.raw(`'${unit}'`)}, ${medicalVisits.visitDate})`;
}

function triageDateTruncExpr(grain: ClinicalReportsGroupBy) {
  const unit = grain === "day" ? "day" : grain === "week" ? "week" : "month";
  return sql`date_trunc(${sql.raw(`'${unit}'`)}, ${triage.triageAt})`;
}

/** Same bucket expression for GROUP BY */
function sqlLocationBucketId(): SQL {
  return sql`COALESCE(${medicalVisits.locationId}, ${sqlUnknownLocationId})`;
}

function triagePeriodKeyExpr(truncExpr: SQL, grain: ClinicalReportsGroupBy): SQL<string> {
  if (grain === "month") {
    return sql<string>`to_char(${truncExpr}, 'YYYY-MM')`;
  }
  return sql<string>`to_char(${truncExpr}, 'YYYY-MM-DD')`;
}

/** Stable calendar period label — same SQL used in SELECT and GROUP BY (fixes empty chart series from bad PG aliases). */
function visitPeriodKeyExpr(truncExpr: SQL, grain: ClinicalReportsGroupBy): SQL<string> {
  if (grain === "month") {
    return sql<string>`to_char(${truncExpr}, 'YYYY-MM')`;
  }
  return sql<string>`to_char(${truncExpr}, 'YYYY-MM-DD')`;
}

function buildVisitFilters(params: ClinicalReportsParams, fromDate: Date, toDate: Date): SQL[] {
  const clauses: SQL[] = [
    eq(medicalVisits.tenantId, params.tenantId),
    gte(medicalVisits.visitDate, fromDate),
    lte(medicalVisits.visitDate, toDate),
  ];
  if (params.locationIds?.length) {
    clauses.push(inArray(medicalVisits.locationId, params.locationIds));
  }
  if (params.visitTypes?.length) {
    clauses.push(inArray(medicalVisits.visitType, params.visitTypes));
  }
  if (params.dispositions?.length) {
    clauses.push(inArray(medicalVisits.disposition, params.dispositions));
  }
  if (params.visitStatus?.length) {
    clauses.push(inArray(medicalVisits.status, params.visitStatus));
  }
  return clauses;
}

function buildCompanyFilters(params: ClinicalReportsParams): SQL[] {
  const clauses: SQL[] = [];
  if (params.companyIds?.length) {
    clauses.push(
      sql`${sqlCompanyBucketId()} IN (${sql.join(
        params.companyIds.map((id) => sql`${id}`),
        sql`, `
      )})`
    );
  }
  if (params.companyTypes?.length) {
    clauses.push(inArray(companies.companyType, params.companyTypes));
  }
  return clauses;
}

function buildTriageFilters(params: ClinicalReportsParams, fromDate: Date, toDate: Date): SQL[] {
  const clauses: SQL[] = [
    eq(triage.tenantId, params.tenantId),
    gte(triage.triageAt, fromDate),
    lte(triage.triageAt, toDate),
  ];
  if (params.locationIds?.length) {
    clauses.push(inArray(triage.locationId, params.locationIds));
  }
  if (params.triageAcuities?.length) {
    clauses.push(inArray(triage.acuity, params.triageAcuities));
  }
  return clauses;
}

function buildIncidentFilters(params: ClinicalReportsParams, fromDate: Date, toDate: Date): SQL[] {
  const clauses: SQL[] = [
    eq(incidentReports.tenantId, params.tenantId),
    gte(incidentReports.incidentDate, fromDate),
    lte(incidentReports.incidentDate, toDate),
  ];
  if (params.locationIds?.length) {
    clauses.push(inArray(incidentReports.locationId, params.locationIds));
  }
  return clauses;
}

/** UTC calendar days from `from` through `to` inclusive (YYYY-MM-DD). */
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

/** Calendar window immediately before `fromIso`, same number of UTC days as `fromIso…toIso` inclusive. */
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

async function fetchVisitKpiAggregate(
  params: ClinicalReportsParams,
  fromDate: Date,
  toDate: Date,
): Promise<{
  totalVisits: number;
  transfers: number;
  ambulanceVisits: number;
  detentionVisits: number;
  returnToWorkVisits: number;
}> {
  const visitWhere = and(...buildVisitFilters(params, fromDate, toDate), ...buildCompanyFilters(params));
  const [row] = await db
    .select({
      totalVisits: count(),
      transfers:
        sql<number>`COALESCE(sum(CASE WHEN ${transferDispositionCondition()} THEN 1 ELSE 0 END), 0)::int`,
      ambulanceVisits:
        sql<number>`COALESCE(sum(CASE WHEN ${ambulanceOnTransferVisitCondition()} THEN 1 ELSE 0 END), 0)::int`,
      detentionVisits:
        sql<number>`COALESCE(sum(CASE WHEN ${medicalVisits.detainedAtFacility} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
      returnToWorkVisits:
        sql<number>`COALESCE(sum(CASE WHEN ${returnToWorkDispositionCondition()} THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(medicalVisits)
    .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
    .leftJoin(employees, eq(employees.id, patients.employeeId))
    .leftJoin(companies, eq(companies.id, employees.companyId))
    .where(visitWhere);
  return {
    totalVisits: Number(row?.totalVisits ?? 0),
    transfers: Number(row?.transfers ?? 0),
    ambulanceVisits: Number(row?.ambulanceVisits ?? 0),
    detentionVisits: Number(row?.detentionVisits ?? 0),
    returnToWorkVisits: Number(row?.returnToWorkVisits ?? 0),
  };
}

async function countTriageEventsForWindow(
  params: ClinicalReportsParams,
  fromDate: Date,
  toDate: Date,
): Promise<number> {
  const triageWhere = and(...buildTriageFilters(params, fromDate, toDate), ...buildCompanyFilters(params));
  const [r] = await db
    .select({ c: count() })
    .from(triage)
    .innerJoin(patients, eq(patients.id, triage.patientId))
    .leftJoin(employees, eq(employees.id, patients.employeeId))
    .leftJoin(companies, eq(companies.id, employees.companyId))
    .where(triageWhere);
  return Number(r?.c ?? 0);
}

async function fetchIncidentAmbulanceAgg(
  params: ClinicalReportsParams,
  fromDate: Date,
  toDate: Date,
): Promise<{ totalIncidents: number; incidentsWithAmbulance: number }> {
  const incidentWhere = and(...buildIncidentFilters(params, fromDate, toDate), ...buildCompanyFilters(params));
  const [row] = await db
    .select({
      totalIncidents: count(),
      incidentsWithAmbulance:
        sql<number>`COALESCE(sum(CASE WHEN ${incidentReports.ambulanceUsed} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(incidentReports)
    .innerJoin(patients, eq(patients.id, incidentReports.patientId))
    .leftJoin(employees, eq(employees.id, patients.employeeId))
    .leftJoin(companies, eq(companies.id, employees.companyId))
    .where(incidentWhere);
  return {
    totalIncidents: Number(row?.totalIncidents ?? 0),
    incidentsWithAmbulance: Number(row?.incidentsWithAmbulance ?? 0),
  };
}

async function countVisitsWithIncidentOverlapForWindow(
  params: ClinicalReportsParams,
  fromDate: Date,
  toDate: Date,
): Promise<number> {
  const visitWhere = and(...buildVisitFilters(params, fromDate, toDate), ...buildCompanyFilters(params));
  const incidentPatients = await db
    .selectDistinct({ patientId: incidentReports.patientId })
    .from(incidentReports)
    .where(
      and(
        eq(incidentReports.tenantId, params.tenantId),
        gte(incidentReports.incidentDate, fromDate),
        lte(incidentReports.incidentDate, toDate),
      ),
    );
  const incidentPids = incidentPatients.map((x) => x.patientId).filter(Boolean) as string[];
  if (incidentPids.length === 0) return 0;
  const overlapWhere = and(visitWhere, inArray(medicalVisits.patientId, incidentPids));
  const [ov] = await db
    .select({ c: count() })
    .from(medicalVisits)
    .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
    .leftJoin(employees, eq(employees.id, patients.employeeId))
    .leftJoin(companies, eq(companies.id, employees.companyId))
    .where(overlapWhere);
  return Number(ov?.c ?? 0);
}

function shapeKpiPayload(
  agg: Awaited<ReturnType<typeof fetchVisitKpiAggregate>>,
  triageEvents: number,
  visitsWithIncidentOverlap: number,
  incidentAgg: { totalIncidents: number; incidentsWithAmbulance: number },
): {
  totalVisits: number;
  triageEvents: number;
  transfers: number;
  transferRate: number | null;
  /** Medical visits with hospital-transfer disposition and ambulance used */
  ambulanceVisits: number;
  /** ambulanceVisits / transfers when there is at least one transfer */
  ambulanceTransferRate: number | null;
  detentionVisits: number;
  detentionRate: number | null;
  returnToWorkVisits: number;
  otherDispositionVisits: number;
  operationalContinuityRate: number | null;
  visitsWithIncidentOverlap: number;
  incidentOverlapRate: number | null;
  totalIncidents: number;
  incidentsWithAmbulance: number;
  /** incidentsWithAmbulance / totalIncidents when there is at least one incident */
  incidentAmbulanceRate: number | null;
} {
  const totalVisits = agg.totalVisits;
  const transfers = agg.transfers;
  const ambulanceVisits = agg.ambulanceVisits;
  const detentionVisits = agg.detentionVisits;
  const returnToWorkVisits = agg.returnToWorkVisits;
  const otherDispositionVisits = Math.max(0, totalVisits - returnToWorkVisits - transfers);
  const rtwVsTransferTotal = returnToWorkVisits + transfers;
  const operationalContinuityRate =
    rtwVsTransferTotal > 0 ? returnToWorkVisits / rtwVsTransferTotal : null;
  const transferRate = totalVisits > 0 ? transfers / totalVisits : null;
  const ambulanceTransferRate = transfers > 0 ? ambulanceVisits / transfers : null;
  const detentionRate = totalVisits > 0 ? detentionVisits / totalVisits : null;
  const incidentOverlapRate = totalVisits > 0 ? visitsWithIncidentOverlap / totalVisits : null;
  const totalIncidents = incidentAgg.totalIncidents;
  const incidentsWithAmbulance = incidentAgg.incidentsWithAmbulance;
  const incidentAmbulanceRate = totalIncidents > 0 ? incidentsWithAmbulance / totalIncidents : null;
  return {
    totalVisits,
    triageEvents,
    transfers,
    transferRate,
    ambulanceVisits,
    ambulanceTransferRate,
    detentionVisits,
    detentionRate,
    returnToWorkVisits,
    otherDispositionVisits,
    operationalContinuityRate,
    visitsWithIncidentOverlap,
    incidentOverlapRate,
    totalIncidents,
    incidentsWithAmbulance,
    incidentAmbulanceRate,
  };
}

export async function fetchClinicalReports(params: ClinicalReportsParams) {
  const { fromDate, toDate } = parseDayRange(params.from, params.to);
  const includeIncidents = params.includeIncidents !== false;
  const visitWhere = and(...buildVisitFilters(params, fromDate, toDate), ...buildCompanyFilters(params));
  const triageWhere = and(...buildTriageFilters(params, fromDate, toDate), ...buildCompanyFilters(params));
  const incidentWhere = and(...buildIncidentFilters(params, fromDate, toDate), ...buildCompanyFilters(params));

  const truncExpr = visitDateTruncExpr(params.groupBy);
  const periodKeyExpr = visitPeriodKeyExpr(truncExpr, params.groupBy);
  const triageTruncExpr = triageDateTruncExpr(params.groupBy);
  const triagePeriodKeyExprResolved = triagePeriodKeyExpr(triageTruncExpr, params.groupBy);
  /** One fragment instance for SELECT + GROUP BY so PostgreSQL sees identical grouping keys. */
  const companyBucketExpr = sqlCompanyBucketId();
  const locationBucketExpr = sqlLocationBucketId();
  const incidentLocationBucketExpr = sql`COALESCE(${incidentReports.locationId}, ${sqlUnknownLocationId})`;

  type IncidentsPerPostDbRow = { locationId: string; locationName: string; count: number };

  const incidentsPerPostPromise: Promise<IncidentsPerPostDbRow[]> = includeIncidents
    ? db
        .select({
          locationId: sql<string>`${incidentLocationBucketExpr}`,
          locationName: sql<string>`MIN(COALESCE(${careLocations.locationName}, 'Unknown location'))`,
          count: sql<number>`count(*)::int`,
        })
        .from(incidentReports)
        .innerJoin(patients, eq(patients.id, incidentReports.patientId))
        .leftJoin(employees, eq(employees.id, patients.employeeId))
        .leftJoin(companies, eq(companies.id, employees.companyId))
        .leftJoin(careLocations, eq(careLocations.id, incidentReports.locationId))
        .where(incidentWhere)
        .groupBy(incidentLocationBucketExpr)
        .orderBy(desc(sql<number>`count(*)::int`))
    : Promise.resolve([]);

  const [
    kpiRows,
    dispositionRows,
    periodRows,
    periodCompanyRows,
    companyAggRows,
    visitTypeRows,
    visitTypeDispositionRows,
    topLocationRows,
    triageAcuityMixRows,
    triagePeriodAcuityRows,
    detentionDispositionRows,
    companyByLocationRows,
    incidentsPerPostRows,
  ] = await Promise.all([
    db
      .select({
        totalVisits: count(),
        transfers:
          sql<number>`COALESCE(sum(CASE WHEN ${transferDispositionCondition()} THEN 1 ELSE 0 END), 0)::int`,
        ambulanceVisits:
          sql<number>`COALESCE(sum(CASE WHEN ${ambulanceOnTransferVisitCondition()} THEN 1 ELSE 0 END), 0)::int`,
        detentionVisits:
          sql<number>`COALESCE(sum(CASE WHEN ${medicalVisits.detainedAtFacility} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
        returnToWorkVisits:
          sql<number>`COALESCE(sum(CASE WHEN ${returnToWorkDispositionCondition()} THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(visitWhere),

    db
      .select({
        disposition: medicalVisits.disposition,
        cnt: count(),
      })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(visitWhere)
      .groupBy(medicalVisits.disposition),

    db
      .select({
        period: periodKeyExpr,
        total: sql<number>`count(*)::int`,
      })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(visitWhere)
      .groupBy(periodKeyExpr)
      .orderBy(asc(periodKeyExpr)),

    db
      .select({
        period: periodKeyExpr,
        companyId: sql<string>`${companyBucketExpr}`,
        companyName: sql<string>`MIN(COALESCE(${companies.name}, 'Unknown company'))`,
        companyType: sql<string | null>`MIN(${companies.companyType})`,
        cnt: sql<number>`count(*)::int`,
      })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(visitWhere)
      .groupBy(periodKeyExpr, companyBucketExpr)
      .orderBy(asc(periodKeyExpr)),

    db
      .select({
        companyId: sql<string>`${companyBucketExpr}`,
        companyName: sql<string>`MIN(COALESCE(${companies.name}, 'Unknown company'))`,
        companyType: sql<string | null>`MIN(${companies.companyType})`,
        visitCount: sql<number>`count(*)::int`,
        transferCount:
          sql<number>`COALESCE(sum(CASE WHEN ${transferDispositionCondition()} THEN 1 ELSE 0 END), 0)::int`,
      })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(visitWhere)
      .groupBy(companyBucketExpr),

    db
      .select({
        visitType: medicalVisits.visitType,
        cnt: sql<number>`count(*)::int`,
      })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(visitWhere)
      .groupBy(medicalVisits.visitType),

    db
      .select({
        visitType: medicalVisits.visitType,
        disposition: medicalVisits.disposition,
        cnt: sql<number>`count(*)::int`,
      })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(visitWhere)
      .groupBy(medicalVisits.visitType, medicalVisits.disposition),

    db
      .select({
        locationId: sql<string>`${locationBucketExpr}`,
        locationName: sql<string>`MIN(COALESCE(${careLocations.locationName}, 'Unknown location'))`,
        count: sql<number>`count(*)::int`,
      })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .leftJoin(careLocations, eq(careLocations.id, medicalVisits.locationId))
      .where(visitWhere)
      .groupBy(locationBucketExpr)
      .orderBy(desc(sql<number>`count(*)::int`))
      .limit(15),

    db
      .select({
        acuity: triage.acuity,
        cnt: sql<number>`count(*)::int`,
      })
      .from(triage)
      .innerJoin(patients, eq(patients.id, triage.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(triageWhere)
      .groupBy(triage.acuity),

    db
      .select({
        period: triagePeriodKeyExprResolved,
        acuity: triage.acuity,
        cnt: sql<number>`count(*)::int`,
      })
      .from(triage)
      .innerJoin(patients, eq(patients.id, triage.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(triageWhere)
      .groupBy(triagePeriodKeyExprResolved, triage.acuity)
      .orderBy(asc(triagePeriodKeyExprResolved)),

    db
      .select({
        disposition: medicalVisits.disposition,
        cnt: sql<number>`count(*)::int`,
      })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(and(visitWhere, eq(medicalVisits.detainedAtFacility, true)))
      .groupBy(medicalVisits.disposition),

    db
      .select({
        companyId: sql<string>`${companyBucketExpr}`,
        companyName: sql<string>`MIN(COALESCE(${companies.name}, 'Unknown company'))`,
        companyType: sql<string | null>`MIN(${companies.companyType})`,
        locationId: sql<string>`${locationBucketExpr}`,
        locationName: sql<string>`MIN(COALESCE(${careLocations.locationName}, 'Unknown location'))`,
        visitCount: sql<number>`count(*)::int`,
      })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .leftJoin(careLocations, eq(careLocations.id, medicalVisits.locationId))
      .where(visitWhere)
      .groupBy(companyBucketExpr, locationBucketExpr),

    incidentsPerPostPromise,
  ]);

  const kpiRow = kpiRows[0];

  const triageEvents = triageAcuityMixRows.reduce((sum, r) => sum + Number(r.cnt ?? 0), 0);

  const triageByCompanyRows = await db
    .select({
      companyId: sql<string>`${companyBucketExpr}`,
      triageEventCount: count(),
    })
    .from(triage)
    .innerJoin(patients, eq(patients.id, triage.patientId))
    .leftJoin(employees, eq(employees.id, patients.employeeId))
    .leftJoin(companies, eq(companies.id, employees.companyId))
    .where(triageWhere)
    .groupBy(companyBucketExpr);

  const triageByCompany = new Map(triageByCompanyRows.map((r) => [r.companyId, Number(r.triageEventCount)]));

  const incidentPatients = await db
    .selectDistinct({ patientId: incidentReports.patientId })
    .from(incidentReports)
    .where(
      and(
        eq(incidentReports.tenantId, params.tenantId),
        gte(incidentReports.incidentDate, fromDate),
        lte(incidentReports.incidentDate, toDate)
      )
    );

  const incidentPids = incidentPatients.map((r) => r.patientId).filter(Boolean) as string[];

  let visitsWithIncidentOverlap = 0;
  if (incidentPids.length > 0) {
    const overlapWhere = and(visitWhere, inArray(medicalVisits.patientId, incidentPids));
    const [ov] = await db
      .select({ c: count() })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(overlapWhere);
    visitsWithIncidentOverlap = Number(ov?.c ?? 0);
  }

  const visitAmbulanceByClinicPromise = db
    .select({
      locationId: sql<string>`${locationBucketExpr}`,
      locationName: sql<string>`MIN(COALESCE(${careLocations.locationName}, 'Unknown location'))`,
      visitCaseCount: sql<number>`count(*)::int`,
      visitTransfers:
        sql<number>`COALESCE(sum(CASE WHEN ${transferDispositionCondition()} THEN 1 ELSE 0 END), 0)::int`,
      visitAmbulanceOnTransfers:
        sql<number>`COALESCE(sum(CASE WHEN ${ambulanceOnTransferVisitCondition()} THEN 1 ELSE 0 END), 0)::int`,
    })
    .from(medicalVisits)
    .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
    .leftJoin(employees, eq(employees.id, patients.employeeId))
    .leftJoin(companies, eq(companies.id, employees.companyId))
    .leftJoin(careLocations, eq(careLocations.id, medicalVisits.locationId))
    .where(visitWhere)
    .groupBy(locationBucketExpr);

  const incidentAmbulanceByClinicPromise = includeIncidents
    ? db
        .select({
          locationId: sql<string>`${incidentLocationBucketExpr}`,
          locationName: sql<string>`MIN(COALESCE(${careLocations.locationName}, 'Unknown location'))`,
          incidentCount: sql<number>`count(*)::int`,
          incidentsWithAmbulance:
            sql<number>`COALESCE(sum(CASE WHEN ${incidentReports.ambulanceUsed} IS TRUE THEN 1 ELSE 0 END), 0)::int`,
        })
        .from(incidentReports)
        .innerJoin(patients, eq(patients.id, incidentReports.patientId))
        .leftJoin(employees, eq(employees.id, patients.employeeId))
        .leftJoin(companies, eq(companies.id, employees.companyId))
        .leftJoin(careLocations, eq(careLocations.id, incidentReports.locationId))
        .where(incidentWhere)
        .groupBy(incidentLocationBucketExpr)
    : Promise.resolve([] as AmbulanceByClinicIncidentRow[]);

  const [incidentAgg, visitAmbulanceByClinicRows, incidentAmbulanceByClinicRows] = await Promise.all([
    includeIncidents
      ? fetchIncidentAmbulanceAgg(params, fromDate, toDate)
      : Promise.resolve({ totalIncidents: 0, incidentsWithAmbulance: 0 }),
    visitAmbulanceByClinicPromise,
    incidentAmbulanceByClinicPromise,
  ]);

  const ambulanceByClinicMerged: Array<{
    locationId: string | null;
    locationName: string;
    visitCaseCount: number;
    visitTransfers: number;
    visitAmbulanceOnTransfers: number;
    visitAmbulanceShareOfTransfers: number | null;
    incidentTotal: number;
    incidentsWithAmbulance: number;
    incidentAmbulanceShare: number | null;
    /** Visits + incidents at this post (same notion as merged “cases” volume per location). */
    totalCasesAtPost: number;
    /** Ambulance on transfers (visits) + ambulance on incidents — single headline count per clinic. */
    totalAmbulanceUsage: number;
    /** totalAmbulanceUsage ÷ totalCasesAtPost — raw intensity vs overall case volume at post. */
    ambulancePerOverallCaseVolume: number | null;
  }> = (() => {
    const visitMap = new Map<string, AmbulanceByClinicVisitRow>();
    for (const r of visitAmbulanceByClinicRows as AmbulanceByClinicVisitRow[]) {
      visitMap.set(r.locationId, {
        locationId: r.locationId,
        locationName: String(r.locationName ?? "Unknown location"),
        visitCaseCount: Number(r.visitCaseCount ?? 0),
        visitTransfers: Number(r.visitTransfers ?? 0),
        visitAmbulanceOnTransfers: Number(r.visitAmbulanceOnTransfers ?? 0),
      });
    }
    const incidentMap = new Map<string, AmbulanceByClinicIncidentRow>();
    for (const r of incidentAmbulanceByClinicRows as AmbulanceByClinicIncidentRow[]) {
      incidentMap.set(r.locationId, {
        locationId: r.locationId,
        locationName: String(r.locationName ?? "Unknown location"),
        incidentCount: Number(r.incidentCount ?? 0),
        incidentsWithAmbulance: Number(r.incidentsWithAmbulance ?? 0),
      });
    }
    const keys = new Set<string>([...visitMap.keys(), ...incidentMap.keys()]);
    const rows = [...keys].map((key) => {
      const v = visitMap.get(key);
      const i = incidentMap.get(key);
      const locationId = key === UNKNOWN_LOCATION ? null : key;
      const locationName = v?.locationName ?? i?.locationName ?? "Unknown location";
      const visitCaseCount = v?.visitCaseCount ?? 0;
      const visitTransfers = v?.visitTransfers ?? 0;
      const visitAmbulanceOnTransfers = v?.visitAmbulanceOnTransfers ?? 0;
      const incidentTotal = i?.incidentCount ?? 0;
      const incidentsWithAmbulance = i?.incidentsWithAmbulance ?? 0;
      const totalCasesAtPost = visitCaseCount + incidentTotal;
      const totalAmbulanceUsage = visitAmbulanceOnTransfers + incidentsWithAmbulance;
      return {
        locationId,
        locationName,
        visitCaseCount,
        visitTransfers,
        visitAmbulanceOnTransfers,
        visitAmbulanceShareOfTransfers:
          visitTransfers > 0 ? visitAmbulanceOnTransfers / visitTransfers : null,
        incidentTotal,
        incidentsWithAmbulance,
        incidentAmbulanceShare: incidentTotal > 0 ? incidentsWithAmbulance / incidentTotal : null,
        totalCasesAtPost,
        totalAmbulanceUsage,
        ambulancePerOverallCaseVolume:
          totalCasesAtPost > 0 ? totalAmbulanceUsage / totalCasesAtPost : null,
      };
    });
    rows.sort((a, b) => {
      const scoreA = a.totalAmbulanceUsage;
      const scoreB = b.totalAmbulanceUsage;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.locationName.localeCompare(b.locationName);
    });
    return rows;
  })();

  const kpis = shapeKpiPayload(
    {
      totalVisits: Number(kpiRow?.totalVisits ?? 0),
      transfers: Number(kpiRow?.transfers ?? 0),
      ambulanceVisits: Number(kpiRow?.ambulanceVisits ?? 0),
      detentionVisits: Number(kpiRow?.detentionVisits ?? 0),
      returnToWorkVisits: Number(kpiRow?.returnToWorkVisits ?? 0),
    },
    triageEvents,
    visitsWithIncidentOverlap,
    incidentAgg,
  );

  const dispositionMix = dispositionRows.map((r) => ({
    disposition: r.disposition ?? "unknown",
    count: Number(r.cnt),
  }));

  const detentionDispositionMix = detentionDispositionRows.map((r) => ({
    disposition: r.disposition ?? "unknown",
    count: Number(r.cnt),
  }));

  const visitTypeMix = visitTypeRows.map((r) => ({
    visitType: r.visitType ?? "unknown",
    count: Number(r.cnt),
  }));

  const visitTypeByDisposition = visitTypeDispositionRows.map((r) => ({
    visitType: r.visitType ?? "unknown",
    disposition: r.disposition ?? "unknown",
    count: Number(r.cnt),
  }));

  const topLocations = topLocationRows.map((r) => ({
    locationId: r.locationId === UNKNOWN_LOCATION ? null : r.locationId,
    locationName: r.locationName,
    count: Number(r.count),
  }));

  const incidentsPerPost = incidentsPerPostRows.map((r) => ({
    locationId: r.locationId === UNKNOWN_LOCATION ? null : r.locationId,
    locationName: String(r.locationName ?? "Unknown location"),
    count: Number(r.count ?? 0),
  }));

  const triageAcuityMix = triageAcuityMixRows.map((r) => ({
    acuity: r.acuity ?? "unknown",
    count: Number(r.cnt),
  }));

  const triageAcuityOverTime = pivotTriageAcuityOverTime(
    triagePeriodAcuityRows.map((r) => ({
      period: r.period,
      acuity: r.acuity,
      cnt: r.cnt,
    })),
  );

  const visitsOverTime = periodRows.map((r) => ({
    period: String((r as { period?: unknown }).period ?? ""),
    total: Number((r as { total?: unknown }).total ?? 0),
  }));

  const visitsOverTimeByCompany = periodCompanyRows.map((r) => ({
    period: String((r as { period?: unknown }).period ?? ""),
    companyId: String((r as { companyId?: unknown }).companyId ?? ""),
    companyName: String((r as { companyName?: unknown }).companyName ?? ""),
    companyType: (r as { companyType?: string | null }).companyType ?? null,
    count: Number((r as { cnt?: unknown }).cnt ?? 0),
  }));

  const byCompany = companyAggRows.map((r) => {
    const vc = Number(r.visitCount);
    const tc = Number(r.transferCount);
    return {
      companyId: r.companyId,
      companyName: r.companyName,
      companyType: r.companyType ?? null,
      visitCount: vc,
      transferCount: tc,
      transferRate: vc > 0 ? tc / vc : null,
      triageEventCount: triageByCompany.get(r.companyId) ?? 0,
    };
  });

  const companyByLocation = companyByLocationRows
    .map((r) => ({
      companyId: r.companyId === UNKNOWN_COMPANY ? null : r.companyId,
      companyName: String(r.companyName ?? "Unknown company"),
      companyType: r.companyType ?? null,
      locationId: r.locationId === UNKNOWN_LOCATION ? null : r.locationId,
      locationName: String(r.locationName ?? "Unknown location"),
      visitCount: Number(r.visitCount ?? 0),
    }))
    .sort(
      (a, b) =>
        a.companyName.localeCompare(b.companyName) || a.locationName.localeCompare(b.locationName),
    );

  const visitDayTrunc = sql`date_trunc('day', ${medicalVisits.visitDate})`;
  const visitDayKeyExpr = sql<string>`to_char(${visitDayTrunc}, 'YYYY-MM-DD')`;
  const incidentDayTrunc = sql`date_trunc('day', ${incidentReports.incidentDate})`;
  const incidentDayKeyExpr = sql<string>`to_char(${incidentDayTrunc}, 'YYYY-MM-DD')`;

  const incidentCaseRowsPromise = includeIncidents
    ? db
        .select({
          day: incidentDayKeyExpr,
          locationId: sql<string>`${incidentLocationBucketExpr}`,
          cnt: sql<number>`count(*)::int`,
        })
        .from(incidentReports)
        .innerJoin(patients, eq(patients.id, incidentReports.patientId))
        .leftJoin(employees, eq(employees.id, patients.employeeId))
        .leftJoin(companies, eq(companies.id, employees.companyId))
        .where(incidentWhere)
        .groupBy(incidentDayTrunc, incidentLocationBucketExpr)
        .orderBy(asc(incidentDayTrunc))
    : Promise.resolve([]);

  const [visitCaseRows, incidentCaseRows] = await Promise.all([
    db
      .select({
        day: visitDayKeyExpr,
        locationId: sql<string>`${locationBucketExpr}`,
        cnt: sql<number>`count(*)::int`,
      })
      .from(medicalVisits)
      .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
      .leftJoin(employees, eq(employees.id, patients.employeeId))
      .leftJoin(companies, eq(companies.id, employees.companyId))
      .where(visitWhere)
      .groupBy(visitDayTrunc, locationBucketExpr)
      .orderBy(asc(visitDayTrunc)),
    incidentCaseRowsPromise,
  ]);

  const cellMap = new Map<string, number>();
  for (const r of visitCaseRows) {
    const day = String((r as { day?: unknown }).day ?? "");
    const loc = String((r as { locationId?: unknown }).locationId ?? UNKNOWN_LOCATION);
    const k = `${day}|${loc}`;
    cellMap.set(k, (cellMap.get(k) ?? 0) + Number((r as { cnt?: unknown }).cnt ?? 0));
  }
  for (const r of incidentCaseRows) {
    const day = String((r as { day?: unknown }).day ?? "");
    const loc = String((r as { locationId?: unknown }).locationId ?? UNKNOWN_LOCATION);
    const k = `${day}|${loc}`;
    cellMap.set(k, (cellMap.get(k) ?? 0) + Number((r as { cnt?: unknown }).cnt ?? 0));
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
          .select({ id: careLocations.id, name: careLocations.locationName })
          .from(careLocations)
          .where(and(eq(careLocations.tenantId, params.tenantId), inArray(careLocations.id, knownLocIds)))
      : [];
  const locationNameById = new Map(locMetaRows.map((r) => [r.id, r.name]));

  type CaseCol = { key: string; locationId: string | null; locationName: string };
  const columns: CaseCol[] = [...allLocIds]
    .map((key) => ({
      key,
      locationId: key === UNKNOWN_LOCATION ? null : key,
      locationName:
        key === UNKNOWN_LOCATION
          ? "Unknown location"
          : locationNameById.get(key) ?? "Unknown care location",
    }))
    .sort((a, b) => {
      if (a.key === UNKNOWN_LOCATION) return 1;
      if (b.key === UNKNOWN_LOCATION) return -1;
      return a.locationName.localeCompare(b.locationName);
    });

  const dates = enumerateUtcDaysInclusive(params.from, params.to);
  const rows = dates.map((date) => {
    const cells = columns.map((col) => cellMap.get(`${date}|${col.key}`) ?? 0);
    const rowTotal = cells.reduce((s, n) => s + n, 0);
    return { date, cells, rowTotal };
  });
  const columnTotals = columns.map((_, j) => rows.reduce((s, row) => s + row.cells[j]!, 0));
  const grandTotal = columnTotals.reduce((s, n) => s + n, 0);

  const casesByDayByPost = {
    dates,
    columns,
    rows,
    columnTotals,
    grandTotal,
  };

  let kpisPriorPeriod: ReturnType<typeof shapeKpiPayload> | null = null;
  let priorPeriod: { from: string; to: string } | undefined;
  if (params.comparePriorPeriod) {
    const pr = computePriorInclusiveRange(params.from, params.to);
    if (pr) {
      priorPeriod = pr;
      const { fromDate: pFrom, toDate: pTo } = parseDayRange(pr.from, pr.to);
      const [aggP, triP, ovP, incAggP] = await Promise.all([
        fetchVisitKpiAggregate(params, pFrom, pTo),
        countTriageEventsForWindow(params, pFrom, pTo),
        countVisitsWithIncidentOverlapForWindow(params, pFrom, pTo),
        includeIncidents ? fetchIncidentAmbulanceAgg(params, pFrom, pTo) : Promise.resolve({ totalIncidents: 0, incidentsWithAmbulance: 0 }),
      ]);
      kpisPriorPeriod = shapeKpiPayload(aggP, triP, ovP, incAggP);
    }
  }

  let detailPayload: {
    rows: Array<{
      visitId: string;
      visitDate: string;
      visitType: string;
      disposition: string;
      status: string | null;
      companyId: string | null;
      companyName: string;
      locationId: string | null;
      locationName: string;
      providerDisplay: string;
    }>;
    page: number;
    pageSize: number;
    totalCount: number;
  } | null = null;

  if (params.includeDetail) {
    const page = Math.max(1, params.detailPage ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.detailPageSize ?? 25));
    const medicalStaffUser = alias(users, "clinical_report_staff");
    const detailVisitWhere = and(...buildVisitFilters(params, fromDate, toDate), ...buildCompanyFilters(params));
    const offset = (page - 1) * pageSize;

    const [detailRows, [countRow]] = await Promise.all([
      db
        .select({
          visitId: medicalVisits.id,
          visitDate: medicalVisits.visitDate,
          visitType: medicalVisits.visitType,
          disposition: medicalVisits.disposition,
          status: medicalVisits.status,
          companyId: companies.id,
          companyName: sql<string>`COALESCE(${companies.name}, 'Unknown company')`,
          locationId: medicalVisits.locationId,
          locationName: sql<string>`COALESCE(${careLocations.locationName}, 'Unknown location')`,
          providerDisplay: sql<string>`COALESCE(NULLIF(trim(concat_ws(' ', ${medicalStaffUser.firstName}, ${medicalStaffUser.lastName})), ''), ${medicalStaffUser.email}, 'Unknown')`,
        })
        .from(medicalVisits)
        .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
        .leftJoin(employees, eq(employees.id, patients.employeeId))
        .leftJoin(companies, eq(companies.id, employees.companyId))
        .leftJoin(careLocations, eq(careLocations.id, medicalVisits.locationId))
        .innerJoin(medicalStaffUser, eq(medicalStaffUser.id, medicalVisits.medicalStaffId))
        .where(detailVisitWhere)
        .orderBy(desc(medicalVisits.visitDate))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ c: count() })
        .from(medicalVisits)
        .innerJoin(patients, eq(patients.id, medicalVisits.patientId))
        .leftJoin(employees, eq(employees.id, patients.employeeId))
        .leftJoin(companies, eq(companies.id, employees.companyId))
        .where(detailVisitWhere),
    ]);

    detailPayload = {
      rows: detailRows.map((r) => ({
        visitId: r.visitId,
        visitDate: r.visitDate instanceof Date ? r.visitDate.toISOString() : String(r.visitDate),
        visitType: r.visitType ?? "",
        disposition: r.disposition ?? "",
        status: r.status ?? null,
        companyId: r.companyId,
        companyName: r.companyName,
        locationId: r.locationId,
        locationName: r.locationName,
        providerDisplay: r.providerDisplay,
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
      priorPeriod,
      filters: {
        includeIncidents,
        locationIds: params.locationIds ?? [],
        visitTypes: params.visitTypes ?? [],
        dispositions: params.dispositions ?? [],
        visitStatus: params.visitStatus ?? [],
        triageAcuities: params.triageAcuities ?? [],
        companyIds: params.companyIds ?? [],
        companyTypes: params.companyTypes ?? [],
      },
    },
    kpis,
    kpisPriorPeriod,
    series: {
      visitsOverTime,
      visitsOverTimeByCompany,
      dispositionMix,
      detentionDispositionMix,
      visitTypeMix,
      triageAcuityMix,
      triageAcuityOverTime,
    },
    tables: {
      byCompany,
      visitTypeByDisposition,
      topLocations,
      incidentsPerPost,
      casesByDayByPost,
      companyByLocation,
      ambulanceByClinic: ambulanceByClinicMerged,
    },
    detail: detailPayload,
  };
}

export function parseClinicalReportsQuery(q: Record<string, unknown>): Omit<ClinicalReportsParams, "tenantId"> {
  const from = typeof q.from === "string" ? q.from : "";
  const to = typeof q.to === "string" ? q.to : "";
  if (!from || !to) {
    throw new Error("Query parameters `from` and `to` (YYYY-MM-DD) are required.");
  }
  const groupByRaw = typeof q.groupBy === "string" ? q.groupBy : "week";
  if (!["day", "week", "month"].includes(groupByRaw)) {
    throw new Error("`groupBy` must be day, week, or month.");
  }
  const groupBy = groupByRaw as ClinicalReportsGroupBy;

  const splitMulti = (v: unknown): string[] | undefined => {
    if (v == null || v === "") return undefined;
    if (Array.isArray(v)) return v.map(String).filter(Boolean);
    const s = String(v);
    return s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  };

  /** Query param omitted → true (backward compatible); explicit false/0/no → false. */
  const parseIncludeIncidents = (v: unknown): boolean => {
    if (v === undefined || v === "") return true;
    const s = String(v).toLowerCase();
    if (["false", "0", "no", "off"].includes(s)) return false;
    if (["true", "1", "yes", "on"].includes(s)) return true;
    return true;
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
    visitTypes: splitMulti(q.visitTypes),
    dispositions: splitMulti(q.dispositions),
    visitStatus: splitMulti(q.visitStatus),
    triageAcuities: splitMulti(q.triageAcuities),
    companyIds: splitMulti(q.companyIds),
    companyTypes: splitMulti(q.companyTypes),
    includeIncidents: parseIncludeIncidents(q.includeIncidents),
    includeDetail: parseBoolDefault(q.includeDetail, false),
    detailPage: parseIntClamped(q.detailPage, 1, 1, 5000),
    detailPageSize: parseIntClamped(q.detailPageSize, 25, 1, 100),
    comparePriorPeriod: parseBoolDefault(q.comparePriorPeriod, false),
  };
}
