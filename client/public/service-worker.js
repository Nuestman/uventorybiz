// Placeholder service worker for uventorybiz.
// Phase 1: No caching or offline logic is implemented yet.
// This file exists so that serviceWorkerRegistration can safely
// register a script without changing runtime behavior.

self.addEventListener("install", () => {
  // Skip waiting so updates activate promptly once we start using the SW.
  self.skipWaiting?.();
});

self.addEventListener("activate", (event) => {
  event.waitUntil?.(self.clients?.claim?.() ?? Promise.resolve());
});

// No fetch handler yet – all requests go directly to the network.

