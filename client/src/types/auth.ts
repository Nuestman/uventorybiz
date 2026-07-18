export interface AuthUser {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role?: string | null;
  profileImageUrl?: string | null;
  tenantId?: string | null;
  phone?: string | null;
  isAdmin?: boolean;
  /** Present when a platform super admin is impersonating a tenant user (support mode). */
  impersonator?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  [key: string]: unknown;
}

