import type { SyncOperation } from "@/types/sync";
import type {
  MessagingInboxCache,
  MessagingOutboxItem,
  MessagingThreadCache,
  OfflineMessageDto,
} from "@/types/offlineMessaging";
import type {
  SymptomLogsCache,
  SymptomOutboxItem,
  SymptomTypesCache,
} from "@/types/offlineSymptoms";
import type { ConversationSummaryDto } from "@shared/messaging";

const DB_NAME = "uventorybiz-offline";
const DB_VERSION = 4;

const STORE_PATIENTS = "patients";
const STORE_MEDICAL_VISITS = "medicalVisits";
const STORE_APPOINTMENTS = "appointments";
const STORE_TRIAGE = "triage";
const STORE_OPERATIONS = "operationsQueue";
const STORE_META = "meta";
const STORE_MESSAGING_INBOX = "messagingInbox";
const STORE_MESSAGING_THREADS = "messagingThreads";
const STORE_MESSAGING_OUTBOX = "messagingOutbox";
const STORE_MESSAGING_LOCAL_CONVERSATIONS = "messagingLocalConversations";
const STORE_SYMPTOM_LOGS = "portalSymptomLogs";
const STORE_SYMPTOM_TYPES = "portalSymptomTypes";
const STORE_SYMPTOM_OUTBOX = "portalSymptomOutbox";

type StoreName =
  | typeof STORE_PATIENTS
  | typeof STORE_MEDICAL_VISITS
  | typeof STORE_APPOINTMENTS
  | typeof STORE_TRIAGE
  | typeof STORE_OPERATIONS
  | typeof STORE_META
  | typeof STORE_MESSAGING_INBOX
  | typeof STORE_MESSAGING_THREADS
  | typeof STORE_MESSAGING_OUTBOX
  | typeof STORE_MESSAGING_LOCAL_CONVERSATIONS
  | typeof STORE_SYMPTOM_LOGS
  | typeof STORE_SYMPTOM_TYPES
  | typeof STORE_SYMPTOM_OUTBOX;

interface MetaEntry {
  key: string;
  value: unknown;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  if (typeof indexedDB === "undefined") {
    // IndexedDB not available (e.g. server-side rendering); use rejected promise
    dbPromise = Promise.reject(
      new Error("IndexedDB is not available in this environment"),
    );
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_PATIENTS)) {
        db.createObjectStore(STORE_PATIENTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_MEDICAL_VISITS)) {
        db.createObjectStore(STORE_MEDICAL_VISITS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_APPOINTMENTS)) {
        db.createObjectStore(STORE_APPOINTMENTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_TRIAGE)) {
        db.createObjectStore(STORE_TRIAGE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_OPERATIONS)) {
        db.createObjectStore(STORE_OPERATIONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGING_INBOX)) {
        db.createObjectStore(STORE_MESSAGING_INBOX, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGING_THREADS)) {
        db.createObjectStore(STORE_MESSAGING_THREADS, { keyPath: "conversationId" });
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGING_OUTBOX)) {
        db.createObjectStore(STORE_MESSAGING_OUTBOX, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGING_LOCAL_CONVERSATIONS)) {
        db.createObjectStore(STORE_MESSAGING_LOCAL_CONVERSATIONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SYMPTOM_LOGS)) {
        db.createObjectStore(STORE_SYMPTOM_LOGS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_SYMPTOM_TYPES)) {
        db.createObjectStore(STORE_SYMPTOM_TYPES, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_SYMPTOM_OUTBOX)) {
        db.createObjectStore(STORE_SYMPTOM_OUTBOX, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IDB error"));
  });

  return dbPromise;
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => T | Promise<T>,
): Promise<T> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);

  // Register completion handlers BEFORE awaiting fn. If we attach oncomplete after an async
  // IDB request resolves, the transaction may already have committed and the event is missed
  // (hangs forever on reads that return a Promise from request.onsuccess).
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB transaction error"));
    tx.onabort = () =>
      reject(tx.error ?? new Error("IDB transaction aborted"));
  });

  const result = await fn(store);
  await done;
  return result;
}

export const offlineStore = {
  /** Store or update an arbitrary patient record */
  async putPatient(record: Record<string, unknown>) {
    await withStore(STORE_PATIENTS, "readwrite", (store) => {
      store.put(record);
    });
  },

  async getPatient(id: string) {
    return withStore(STORE_PATIENTS, "readonly", (store) => {
      return new Promise<Record<string, unknown> | undefined>((resolve) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result ?? undefined);
        request.onerror = () => resolve(undefined);
      });
    });
  },

  async getAllPatients() {
    return withStore(STORE_PATIENTS, "readonly", (store) => {
      return new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as Record<string, unknown>[]);
        request.onerror = () => reject(request.error ?? new Error("IDB getAll error"));
      });
    });
  },

  /** Store or update a medical visit record */
  async putMedicalVisit(record: Record<string, unknown>) {
    await withStore(STORE_MEDICAL_VISITS, "readwrite", (store) => {
      store.put(record);
    });
  },

  async getMedicalVisit(id: string) {
    return withStore(STORE_MEDICAL_VISITS, "readonly", (store) => {
      return new Promise<Record<string, unknown> | undefined>((resolve) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result ?? undefined);
        request.onerror = () => resolve(undefined);
      });
    });
  },

  async getAllMedicalVisits() {
    return withStore(STORE_MEDICAL_VISITS, "readonly", (store) => {
      return new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as Record<string, unknown>[]);
        request.onerror = () => reject(request.error ?? new Error("IDB getAll error"));
      });
    });
  },

  /** Local triage records (pending sync) — same shape as API triage for visit form */
  async putTriage(record: Record<string, unknown>) {
    await withStore(STORE_TRIAGE, "readwrite", (store) => {
      store.put(record);
    });
  },

  async getTriageByPatientId(patientId: string) {
    return withStore(STORE_TRIAGE, "readonly", (store) => {
      return new Promise<Record<string, unknown>[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const all = (request.result as Record<string, unknown>[]).filter(
            (r) => r.patientId === patientId,
          );
          resolve(all);
        };
        request.onerror = () =>
          reject(request.error ?? new Error("IDB getAll error"));
      });
    });
  },

  async removeTriage(id: string) {
    await withStore(STORE_TRIAGE, "readwrite", (store) => {
      store.delete(id);
    });
  },

  /** Queue a sync operation for later processing */
  async queueOperation(operation: SyncOperation) {
    await withStore(STORE_OPERATIONS, "readwrite", (store) => {
      store.put(operation);
    });
  },

  /**
   * Atomically queue the sync op + triage row in one transaction (Firefox-safe).
   * Avoids sequential transactions + a follow-up getAll that could hang with our withStore pattern.
   */
  async queueTriageAndPendingOperation(
    operation: SyncOperation,
    triageRecord: Record<string, unknown>,
  ): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(
        [STORE_OPERATIONS, STORE_TRIAGE],
        "readwrite",
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IDB transaction error"));
      tx.onabort = () =>
        reject(tx.error ?? new Error("IDB transaction aborted"));
      tx.objectStore(STORE_OPERATIONS).put(operation);
      tx.objectStore(STORE_TRIAGE).put(triageRecord);
    });
  },

  async getPendingOperations(limit?: number) {
    return withStore(STORE_OPERATIONS, "readonly", (store) => {
      return new Promise<SyncOperation[]>((resolve, reject) => {
        const operations: SyncOperation[] = [];
        const request = store.openCursor();

        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve(operations);
            return;
          }
          operations.push(cursor.value as SyncOperation);
          if (limit && operations.length >= limit) {
            resolve(operations);
            return;
          }
          cursor.continue();
        };

        request.onerror = () =>
          reject(request.error ?? new Error("IDB cursor error"));
      });
    });
  },

  async removeOperation(id: string) {
    await withStore(STORE_OPERATIONS, "readwrite", (store) => {
      store.delete(id);
    });
  },

  /** Store small metadata items like lastSyncCursor */
  async setMeta(key: string, value: unknown) {
    const entry: MetaEntry = { key, value };
    await withStore(STORE_META, "readwrite", (store) => {
      store.put(entry);
    });
  },

  async getMeta<T = unknown>(key: string): Promise<T | undefined> {
    return withStore(STORE_META, "readonly", (store) => {
      return new Promise<T | undefined>((resolve) => {
        const request = store.get(key);
        request.onsuccess = () => {
          if (!request.result) {
            resolve(undefined);
          } else {
            resolve(request.result.value as T);
          }
        };
        request.onerror = () => resolve(undefined);
      });
    });
  },

  async putMessagingInbox(cache: MessagingInboxCache) {
    await withStore(STORE_MESSAGING_INBOX, "readwrite", (store) => {
      store.put(cache);
    });
  },

  async getMessagingInbox(key: string) {
    return withStore(STORE_MESSAGING_INBOX, "readonly", (store) => {
      return new Promise<MessagingInboxCache | undefined>(
        (resolve) => {
          const request = store.get(key);
          request.onsuccess = () => resolve(request.result ?? undefined);
          request.onerror = () => resolve(undefined);
        },
      );
    });
  },

  async getAllMessagingInboxCaches() {
    return withStore(STORE_MESSAGING_INBOX, "readonly", (store) => {
      return new Promise<MessagingInboxCache[]>(
        (resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result as MessagingInboxCache[]);
          request.onerror = () =>
            reject(request.error ?? new Error("IDB getAll error"));
        },
      );
    });
  },

  async putMessagingThread(cache: MessagingThreadCache) {
    await withStore(STORE_MESSAGING_THREADS, "readwrite", (store) => {
      store.put(cache);
    });
  },

  async getMessagingThread(conversationId: string) {
    return withStore(STORE_MESSAGING_THREADS, "readonly", (store) => {
      return new Promise<MessagingThreadCache | undefined>(
        (resolve) => {
          const request = store.get(conversationId);
          request.onsuccess = () => resolve(request.result ?? undefined);
          request.onerror = () => resolve(undefined);
        },
      );
    });
  },

  async deleteMessagingThread(conversationId: string) {
    await withStore(STORE_MESSAGING_THREADS, "readwrite", (store) => {
      store.delete(conversationId);
    });
  },

  async putMessagingOutbox(item: MessagingOutboxItem) {
    await withStore(STORE_MESSAGING_OUTBOX, "readwrite", (store) => {
      store.put(item);
    });
  },

  async getMessagingOutbox() {
    return withStore(STORE_MESSAGING_OUTBOX, "readonly", (store) => {
      return new Promise<MessagingOutboxItem[]>(
        (resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result as MessagingOutboxItem[]);
          request.onerror = () =>
            reject(request.error ?? new Error("IDB getAll error"));
        },
      );
    });
  },

  async removeMessagingOutbox(id: string) {
    await withStore(STORE_MESSAGING_OUTBOX, "readwrite", (store) => {
      store.delete(id);
    });
  },

  async putLocalConversation(conversation: ConversationSummaryDto) {
    await withStore(STORE_MESSAGING_LOCAL_CONVERSATIONS, "readwrite", (store) => {
      store.put(conversation);
    });
  },

  async getLocalConversations() {
    return withStore(STORE_MESSAGING_LOCAL_CONVERSATIONS, "readonly", (store) => {
      return new Promise<ConversationSummaryDto[]>(
        (resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result as ConversationSummaryDto[]);
          request.onerror = () =>
            reject(request.error ?? new Error("IDB getAll error"));
        },
      );
    });
  },

  async removeLocalConversation(id: string) {
    await withStore(STORE_MESSAGING_LOCAL_CONVERSATIONS, "readwrite", (store) => {
      store.delete(id);
    });
  },

  async putSymptomLogsCache(cache: SymptomLogsCache) {
    await withStore(STORE_SYMPTOM_LOGS, "readwrite", (store) => {
      store.put(cache);
    });
  },

  async getSymptomLogsCache(key: string) {
    return withStore(STORE_SYMPTOM_LOGS, "readonly", (store) => {
      return new Promise<SymptomLogsCache | undefined>((resolve) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ?? undefined);
        request.onerror = () => resolve(undefined);
      });
    });
  },

  async putSymptomTypesCache(cache: SymptomTypesCache & { key?: string }) {
    const entry = { key: "default", ...cache };
    await withStore(STORE_SYMPTOM_TYPES, "readwrite", (store) => {
      store.put(entry);
    });
  },

  async getSymptomTypesCache() {
    return withStore(STORE_SYMPTOM_TYPES, "readonly", (store) => {
      return new Promise<SymptomTypesCache | undefined>((resolve) => {
        const request = store.get("default");
        request.onsuccess = () => {
          if (!request.result) {
            resolve(undefined);
            return;
          }
          const { key: _key, ...rest } = request.result as SymptomTypesCache & { key: string };
          resolve(rest);
        };
        request.onerror = () => resolve(undefined);
      });
    });
  },

  async putSymptomOutbox(item: SymptomOutboxItem) {
    await withStore(STORE_SYMPTOM_OUTBOX, "readwrite", (store) => {
      store.put(item);
    });
  },

  async getSymptomOutbox() {
    return withStore(STORE_SYMPTOM_OUTBOX, "readonly", (store) => {
      return new Promise<SymptomOutboxItem[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as SymptomOutboxItem[]);
        request.onerror = () =>
          reject(request.error ?? new Error("IDB getAll error"));
      });
    });
  },

  async removeSymptomOutbox(id: string) {
    await withStore(STORE_SYMPTOM_OUTBOX, "readwrite", (store) => {
      store.delete(id);
    });
  },
};

