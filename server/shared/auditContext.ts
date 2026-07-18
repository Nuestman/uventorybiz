import { AsyncLocalStorage } from "node:async_hooks";

export type AuditContextStore = {
  impersonatorUserId: string | null;
};

export const auditContext = new AsyncLocalStorage<AuditContextStore>();

export function getAuditContext(): AuditContextStore | undefined {
  return auditContext.getStore();
}
