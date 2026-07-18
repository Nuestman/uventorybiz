import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().optional(),
  phoneNumber: z.string().min(10).optional(),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  password: z.string().min(8),
  tenantId: z.string().optional(),
  employeeId: z.string().optional(),
  employeeNumber: z.string().optional(),
  role: z.enum(['admin', 'staff', 'operations', 'fleet_operator', 'super_admin']).optional(),
  acceptTermsAndPrivacy: z.boolean().refine((v) => v === true, {
    message: "You must accept the Terms of Service and Privacy Policy",
  }),
}).refine(data => data.email || data.phoneNumber, {
  message: "Either email or phone number is required"
});

export const loginSchema = z.object({
  identifier: z.string(),
  password: z.string(),
  tenantId: z.string().optional(),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export type OidcLoginErrorCode =
  | "no_account"
  | "account_conflict"
  | "inactive"
  | "invalid_domain"
  | "no_email"
  | "tenant_inactive";

export class OidcLoginError extends Error {
  constructor(
    public readonly code: OidcLoginErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "OidcLoginError";
  }
}
