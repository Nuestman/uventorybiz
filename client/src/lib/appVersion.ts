const fallbackVersion =
  typeof __APP_VERSION__ === "string" && __APP_VERSION__.length > 0
    ? __APP_VERSION__
    : "dev";

export const APP_VERSION =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_APP_VERSION as string | undefined)) ||
  fallbackVersion;

