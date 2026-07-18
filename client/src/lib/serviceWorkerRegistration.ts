/**
 * Service worker registration helper for future offline/PWA features.
 *
 * Phase 1: This file only exposes a registerServiceWorker function.
 * It is not called automatically to avoid changing runtime behavior
 * until offline sync endpoints and caching strategies are finalized.
 */
export async function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  // Use a dedicated SW file at the app root; implementation will be added later.
  const swUrl = "/service-worker.js";

  try {
    await navigator.serviceWorker.register(swUrl);
    // Future: add logging / version checks here if needed.
  } catch (error) {
    // Intentionally silent for now; we will add proper logging once SW behavior is defined.
    // eslint-disable-next-line no-console
    console.error("Service worker registration failed", error);
  }
}

