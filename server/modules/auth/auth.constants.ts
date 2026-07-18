/**
 * Legacy `users.auth_provider` value for staff email/password accounts.
 * The string `"custom"` is a deprecated name from the pre-4.26 module layout;
 * keep until a DB migration renames the stored value.
 */
export const LEGACY_STAFF_AUTH_PROVIDER = "custom" as const;
