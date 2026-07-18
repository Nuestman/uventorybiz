export type EntityType =
  | "patient"
  | "medicalVisit"
  | "triage"
  | "vitalSigns"
  | "appointment"
  | "operationalDuty";

export type OperationType = "CREATE" | "UPDATE" | "DELETE";

export interface SyncOperation {
  /** Local operation id (UUID or similar) */
  id: string;
  /** Logical entity type for routing on the server */
  entityType: EntityType;
  /** Server id, if known */
  entityId?: string;
  /** Client-generated id for new entities created offline */
  clientId?: string;
  /** Tenant and user context (derived from current session) */
  tenantId: string;
  userId: string;
  /** Type of change being applied */
  operationType: OperationType;
  /** Arbitrary payload; interpreted by server-side sync handlers */
  payload: Record<string, unknown>;
  /** Version of the entity when this change was made (for conflict detection) */
  baseVersion?: number | string;
  /** Local timestamps and retry metadata */
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

