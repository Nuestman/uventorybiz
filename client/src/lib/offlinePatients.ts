import { offlineStore } from "@/lib/offlineStore";

/**
 * Fetch patients with an offline-first strategy.
 * When online, fetch from the API and cache in IndexedDB.
 * When offline, return all cached patients from IndexedDB.
 */
export async function fetchPatientsOfflineFirst(search?: string) {
  const isOnline =
    typeof navigator === "undefined" ? true : navigator.onLine;

  if (!isOnline) {
    const local = await offlineStore.getAllPatients();
    return local as any[];
  }

  const url = search
    ? `/api/patients?search=${encodeURIComponent(search)}`
    : "/api/patients";

  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Failed to fetch patients");
  }

  const list = (await res.json()) as any[];

  // Cache by patient.id so other screens can reuse this data offline
  try {
    await Promise.all(
      list
        .filter(
          (entry: any) =>
            entry && entry.patient && typeof entry.patient.id === "string",
        )
        .map((entry: any) =>
          offlineStore.putPatient({
            id: entry.patient.id,
            ...entry,
          }),
        ),
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to cache patients offline", error);
  }

  return list;
}

