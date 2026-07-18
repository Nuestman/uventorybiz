import type { IStorage } from "../../storage";

export type TestingResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

function wrap<T>(p: Promise<T>, errMsg: string): Promise<TestingResult<T>> {
  return p.then((data) => ({ ok: true as const, data })).catch((err) => {
    console.error(errMsg, err);
    return { ok: false as const, error: err instanceof Error ? err.message : errMsg };
  });
}

export function createTestingController(storage: IStorage) {
  return {
    getAnalytics(tenantId: string) {
      return wrap(storage.getTestingAnalytics(tenantId), "Testing controller getAnalytics:");
    },

    getDrugTests(tenantId: string, filters?: { employeeId?: string; testType?: string; result?: string; dateFrom?: Date; dateTo?: Date; programId?: string }) {
      return wrap(storage.getDrugTests(tenantId, filters), "Testing controller getDrugTests:");
    },
    createDrugTest(tenantId: string, body: Parameters<IStorage["createDrugTest"]>[0]) {
      return wrap(storage.createDrugTest(body, tenantId), "Testing controller createDrugTest:");
    },
    getDrugTest(id: string, tenantId: string) {
      return wrap(storage.getDrugTest(id, tenantId), "Testing controller getDrugTest:").then((r) => {
        if (r.ok && !r.data) return { ok: false as const, error: "Drug test not found", code: "NOT_FOUND" as const };
        return r;
      });
    },
    updateDrugTest(id: string, tenantId: string, userId: string | undefined, body: Record<string, unknown>) {
      return wrap(storage.updateDrugTest(id, body as any, tenantId, userId), "Testing controller updateDrugTest:");
    },
    deleteDrugTest(id: string, tenantId: string) {
      return wrap(storage.deleteDrugTest(id, tenantId).then(() => ({ message: "Drug test deleted successfully" })), "Testing controller deleteDrugTest:");
    },

    getAlcoholTests(tenantId: string, filters?: { employeeId?: string; testType?: string; result?: string; dateFrom?: Date; dateTo?: Date; programId?: string }) {
      return wrap(storage.getAlcoholTests(tenantId, filters), "Testing controller getAlcoholTests:");
    },
    createAlcoholTest(tenantId: string, body: Parameters<IStorage["createAlcoholTest"]>[0]) {
      return wrap(storage.createAlcoholTest(body, tenantId), "Testing controller createAlcoholTest:");
    },
    getAlcoholTest(id: string, tenantId: string) {
      return wrap(storage.getAlcoholTest(id, tenantId), "Testing controller getAlcoholTest:").then((r) => {
        if (r.ok && !r.data) return { ok: false as const, error: "Alcohol test not found", code: "NOT_FOUND" as const };
        return r;
      });
    },
    updateAlcoholTest(id: string, tenantId: string, userId: string | undefined, body: Record<string, unknown>) {
      return wrap(storage.updateAlcoholTest(id, body as any, tenantId, userId), "Testing controller updateAlcoholTest:");
    },
    deleteAlcoholTest(id: string, tenantId: string) {
      return wrap(storage.deleteAlcoholTest(id, tenantId).then(() => ({ message: "Alcohol test deleted successfully" })), "Testing controller deleteAlcoholTest:");
    },

    getHydrationTests(tenantId: string, filters?: { employeeId?: string; testType?: string; result?: string; dateFrom?: Date; dateTo?: Date; programId?: string }) {
      return wrap(storage.getHydrationTests(tenantId, filters), "Testing controller getHydrationTests:");
    },
    createHydrationTest(tenantId: string, body: Parameters<IStorage["createHydrationTest"]>[0]) {
      return wrap(storage.createHydrationTest(body, tenantId), "Testing controller createHydrationTest:");
    },
    getHydrationTest(id: string, tenantId: string) {
      return wrap(storage.getHydrationTest(id, tenantId), "Testing controller getHydrationTest:").then((r) => {
        if (r.ok && !r.data) return { ok: false as const, error: "Hydration test not found", code: "NOT_FOUND" as const };
        return r;
      });
    },
    updateHydrationTest(id: string, tenantId: string, userId: string | undefined, body: Record<string, unknown>) {
      return wrap(storage.updateHydrationTest(id, body as any, tenantId, userId), "Testing controller updateHydrationTest:");
    },
    deleteHydrationTest(id: string, tenantId: string) {
      return wrap(storage.deleteHydrationTest(id, tenantId).then(() => ({ message: "Hydration test deleted successfully" })), "Testing controller deleteHydrationTest:");
    },

    getInstantTests(tenantId: string, filters?: { employeeId?: string; customerId?: string; testType?: string; dateFrom?: Date; dateTo?: Date }) {
      return wrap(storage.getInstantTests(tenantId, filters), "Testing controller getInstantTests:");
    },
    createInstantTest(tenantId: string, body: Parameters<IStorage["createInstantTest"]>[0]) {
      return wrap(storage.createInstantTest(body, tenantId), "Testing controller createInstantTest:");
    },
    getInstantTest(id: string, tenantId: string) {
      return wrap(storage.getInstantTest(id, tenantId), "Testing controller getInstantTest:").then((r) => {
        if (r.ok && !r.data) return { ok: false as const, error: "Instant test not found", code: "NOT_FOUND" as const };
        return r;
      });
    },
    updateInstantTest(id: string, tenantId: string, userId: string | undefined, body: Record<string, unknown>) {
      return wrap(storage.updateInstantTest(id, body as any, tenantId, userId), "Testing controller updateInstantTest:");
    },
    deleteInstantTest(id: string, tenantId: string) {
      return wrap(storage.deleteInstantTest(id, tenantId).then(() => ({ message: "Instant test deleted successfully" })), "Testing controller deleteInstantTest:");
    },

    getRandomTestingPools(tenantId: string, filters?: { department?: string; active?: boolean }) {
      return wrap(storage.getRandomTestingPools(tenantId, filters), "Testing controller getRandomTestingPools:");
    },
    createRandomTestingPool(tenantId: string, body: Parameters<IStorage["createRandomTestingPool"]>[0]) {
      return wrap(storage.createRandomTestingPool(body, tenantId), "Testing controller createRandomTestingPool:");
    },
    getRandomTestingPool(id: string, tenantId: string) {
      return wrap(storage.getRandomTestingPool(id, tenantId), "Testing controller getRandomTestingPool:").then((r) => {
        if (r.ok && !r.data) return { ok: false as const, error: "Random testing pool not found", code: "NOT_FOUND" as const };
        return r;
      });
    },
    updateRandomTestingPool(id: string, tenantId: string, body: Record<string, unknown>) {
      return wrap(storage.updateRandomTestingPool(id, body as any, tenantId), "Testing controller updateRandomTestingPool:");
    },
    deleteRandomTestingPool(id: string, tenantId: string) {
      return wrap(storage.deleteRandomTestingPool(id, tenantId).then(() => ({ message: "Random testing pool deleted successfully" })), "Testing controller deleteRandomTestingPool:");
    },
    generateRandomSelections(poolId: string, selectionCount: number, tenantId: string) {
      return wrap(storage.generateRandomSelections(poolId, selectionCount, tenantId), "Testing controller generateRandomSelections:");
    },

    getRandomSelections(tenantId: string, filters?: { poolId?: string; employeeId?: string; dateFrom?: Date; dateTo?: Date; testCompleted?: boolean }) {
      return wrap(storage.getRandomSelections(tenantId, filters), "Testing controller getRandomSelections:");
    },
    createRandomSelection(tenantId: string, body: Parameters<IStorage["createRandomSelection"]>[0]) {
      return wrap(storage.createRandomSelection(body, tenantId), "Testing controller createRandomSelection:");
    },
    updateRandomSelection(id: string, tenantId: string, body: Record<string, unknown>) {
      return wrap(storage.updateRandomSelection(id, body as any, tenantId), "Testing controller updateRandomSelection:");
    },
    deleteRandomSelection(id: string, tenantId: string) {
      return wrap(storage.deleteRandomSelection(id, tenantId).then(() => ({ message: "Random selection deleted successfully" })), "Testing controller deleteRandomSelection:");
    },
  };
}

export type TestingController = ReturnType<typeof createTestingController>;
