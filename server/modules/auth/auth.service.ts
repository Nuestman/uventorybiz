import bcrypt from "bcrypt";
import crypto from "crypto";
import type { IStorage } from "../../storage";
import type { User, UserSession } from "@shared/schema";
import { z } from "zod";
import { getTenantSecurityPolicy } from "../security/security.repository";
import {
  issueStaffSession,
  staffMfaGate,
  staffRedirectFor,
  staffUserPayload,
  validateStaffSessionRow,
  type StaffUserPayload,
} from "./staffAuth.service";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  OidcLoginError,
} from "./auth.schemas";
import { LEGACY_STAFF_AUTH_PROVIDER } from "./auth.constants";

export class AuthService {
  private saltRounds = 12;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async registerUser(data: z.infer<typeof registerSchema>) {
    const { acceptTermsAndPrivacy, ...reg } = data;
    if (acceptTermsAndPrivacy !== true) {
      throw new Error("Terms of Service and Privacy Policy must be accepted");
    }

    const existingUser = await this.storage.getUserByEmailOrPhone(
      reg.email || "",
      reg.phoneNumber || ""
    );

    if (existingUser) {
      throw new Error("User already exists with this email or phone number");
    }

    const isSuperAdmin = reg.role === 'super_admin';
    const finalTenantId = isSuperAdmin ? null : reg.tenantId;

    if (!isSuperAdmin && !finalTenantId) {
      throw new Error("Tenant ID is required for tenant-bound users. Please select or create a tenant during registration.");
    }

    const userRole = isSuperAdmin ? 'super_admin' : (reg.role || 'admin');
    const hashedPassword = await this.hashPassword(reg.password);
    const emailVerificationToken = reg.email ? this.generateToken() : null;
    const phoneVerificationCode = reg.phoneNumber ? this.generateVerificationCode() : null;

    const user = await this.storage.createCustomUser({
      email: reg.email,
      phoneNumber: reg.phoneNumber,
      firstName: reg.firstName,
      lastName: reg.lastName,
      password: hashedPassword,
      authProvider: LEGACY_STAFF_AUTH_PROVIDER,
      tenantId: finalTenantId,
      employeeId: reg.employeeId,
      employeeNumber: reg.employeeNumber?.trim() || undefined,
      role: userRole,
      status: isSuperAdmin ? 'active' : 'pending',
      emailVerificationToken,
      phoneVerificationCode,
      phoneVerificationExpires: reg.phoneNumber ?
        new Date(Date.now() + 15 * 60 * 1000) : null,
    } as Parameters<IStorage["createCustomUser"]>[0]);

    if (reg.email && emailVerificationToken) {
      await this.sendVerificationEmail(reg.email, emailVerificationToken);
    }
    if (reg.phoneNumber && phoneVerificationCode) {
      await this.sendVerificationSMS(reg.phoneNumber, phoneVerificationCode);
    }

    return {
      success: true,
      message: "User registered successfully. Please verify your email/phone.",
      userId: user.id
    };
  }

  async loginUser(data: z.infer<typeof loginSchema>) {
    const user = await this.storage.getUserByEmailOrPhone(data.identifier, data.identifier);

    if (!user || user.authProvider !== LEGACY_STAFF_AUTH_PROVIDER) {
      throw new Error("Invalid credentials");
    }
    if (!user.password) {
      throw new Error("User account has no password set");
    }
    const isValidPassword = await this.verifyPassword(data.password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }
    if (user.status === "pending") {
      throw new Error("Account is pending approval. Please wait for admin approval.");
    } else if (user.status !== "active") {
      throw new Error("Account is suspended. Please contact support.");
    }
    if (user.tenantId) {
      const tenant = await this.storage.getTenant(user.tenantId);
      if (!tenant || tenant.status !== "active") {
        throw new Error("Your organization has not been activated yet. Please contact support.");
      }
    }

    const policy = await getTenantSecurityPolicy(user.tenantId);
    const gate = await staffMfaGate(this.storage, user, policy, () => this.generateToken());

    if (gate.kind === "mfa") {
      return {
        success: true,
        requiresMfa: true,
        mfaChallengeToken: gate.mfaChallengeToken,
        user: staffUserPayload(user),
      };
    }
    if (gate.kind === "setup") {
      return {
        success: true,
        requiresMfaSetup: true,
        setupToken: gate.setupToken,
        user: staffUserPayload(user),
      };
    }

    return {
      success: true,
      user: staffUserPayload(user),
      sessionToken: gate.sessionToken,
      sessionMaxAgeMs: gate.sessionMaxAgeMs,
      redirectTo: gate.redirectTo,
    };
  }

  /** Complete login after MFA verification (password or OIDC path). */
  async completeStaffLoginAfterMfa(userId: string) {
    const user = await this.storage.getUserById(userId);
    if (!user) throw new Error("User not found");
    const sess = await issueStaffSession(this.storage, user);
    return {
      success: true,
      user: staffUserPayload(user),
      sessionToken: sess.sessionToken,
      sessionMaxAgeMs: sess.sessionMaxAgeMs,
      redirectTo: staffRedirectFor(user),
    };
  }

  async verifyEmail(data: z.infer<typeof verifyEmailSchema>) {
    const user = await this.storage.getUserByEmail(data.email);
    if (!user || user.emailVerificationToken !== data.code) {
      throw new Error("Invalid verification code");
    }
    await this.storage.updateUser(user.id, {
      isEmailVerified: true,
      emailVerificationToken: null,
    });
    return { success: true, message: "Email verified successfully" };
  }

  async forgotPassword(data: z.infer<typeof forgotPasswordSchema>) {
    const user = await this.storage.getUserByEmail(data.email);
    if (!user || user.authProvider !== LEGACY_STAFF_AUTH_PROVIDER) {
      return { success: true, message: "If account exists, password reset email sent" };
    }
    const resetToken = this.generateToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await this.storage.updateUser(user.id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetExpires,
    });
    await this.sendPasswordResetEmail(user.email!, resetToken);
    return { success: true, message: "Password reset email sent" };
  }

  async resetPassword(data: z.infer<typeof resetPasswordSchema>) {
    const user = await this.storage.getUserByPasswordResetToken(data.token);
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new Error("Invalid or expired reset token");
    }
    const hashedPassword = await this.hashPassword(data.password);
    await this.storage.updateUser(user.id, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });
    return { success: true, message: "Password reset successfully" };
  }

  async changePassword(userId: string, data: z.infer<typeof changePasswordSchema>) {
    const user = await this.storage.getUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    if (user.authProvider !== LEGACY_STAFF_AUTH_PROVIDER) {
      throw new Error("Password change is only available for local accounts");
    }
    if (!user.password) {
      throw new Error("Account password is not configured");
    }

    const isValidCurrentPassword = await this.verifyPassword(data.currentPassword, user.password);
    if (!isValidCurrentPassword) {
      throw new Error("Current password is incorrect");
    }

    const isSamePassword = await this.verifyPassword(data.newPassword, user.password);
    if (isSamePassword) {
      throw new Error("New password must be different from current password");
    }

    const hashedPassword = await this.hashPassword(data.newPassword);
    await this.storage.updateUser(userId, {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    return { success: true, message: "Password updated successfully" };
  }

  async validateSession(sessionToken: string) {
    const session = await this.storage.getUserSession(sessionToken);
    if (!session) return null;
    const user = await this.storage.getUser(session.userId);
    if (!user) return null;
    const ok = await validateStaffSessionRow(this.storage, session, user);
    return ok ? user : null;
  }

  async validateSessionForRequest(sessionToken: string) {
    const user = await this.validateSession(sessionToken);
    if (!user) return null;
    if (user.tenantId) {
      const tenant = await this.storage.getTenant(user.tenantId);
      if (!tenant || tenant.status !== "active") {
        await this.storage.deleteUserSession(sessionToken);
        return null;
      }
    }
    return user;
  }

  /**
   * Validates the session and returns the effective user, session row, and optional impersonator profile.
   * Used by auth middleware so tenant context matches the impersonated user while audits retain impersonator id via AsyncLocalStorage.
   */
  async validateSessionForRequestWithContext(sessionToken: string): Promise<{
    user: User;
    session: UserSession;
    impersonator: User | null;
  } | null> {
    const session = await this.storage.getUserSession(sessionToken);
    if (!session) return null;
    const user = await this.storage.getUser(session.userId);
    if (!user) return null;
    if (user.tenantId) {
      const tenant = await this.storage.getTenant(user.tenantId);
      if (!tenant || tenant.status !== "active") {
        await this.storage.deleteUserSession(sessionToken);
        return null;
      }
    }
    const ok = await validateStaffSessionRow(this.storage, session, user);
    if (!ok) return null;
    let impersonator: User | null = null;
    if (session.impersonatorUserId) {
      impersonator = (await this.storage.getUserById(session.impersonatorUserId)) ?? null;
    }
    return { user, session, impersonator };
  }

  async logout(sessionToken: string) {
    try {
      await this.storage.deleteUserSession(sessionToken);
      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: true, message: "Logged out successfully" };
    }
  }

  /**
   * Completes OIDC sign-in: match by (iss, sub) or link existing user by email (invite-only; no JIT).
   */
  async completeOidcLogin(params: {
    issuer: string;
    sub: string;
    email: string | undefined;
    preferredUsername?: string | undefined;
    provider: "google" | "microsoft";
  }): Promise<
    | {
        kind: "session";
        sessionToken: string;
        sessionMaxAgeMs: number;
        user: StaffUserPayload;
        redirectTo: string;
      }
    | { kind: "mfa"; mfaChallengeToken: string; user: StaffUserPayload }
    | { kind: "setup"; setupToken: string; user: StaffUserPayload }
  > {
    const emailRaw = params.email ?? params.preferredUsername;
    if (!emailRaw || typeof emailRaw !== "string") {
      throw new OidcLoginError("no_email");
    }
    const normalizedEmail = emailRaw.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      throw new OidcLoginError("no_email");
    }
    const domain = normalizedEmail.split("@")[1] ?? "";
    const allowlist = process.env.OIDC_ALLOWED_EMAIL_DOMAINS?.split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    if (allowlist?.length && !allowlist.some((d) => domain === d || domain.endsWith(`.${d}`))) {
      throw new OidcLoginError("invalid_domain");
    }

    const { issuer, sub, provider } = params;

    let user = await this.storage.getUserByOidcSubject(issuer, sub);
    if (!user) {
      const byEmail = await this.storage.getUserByEmailNormalized(normalizedEmail);
      if (!byEmail) {
        throw new OidcLoginError("no_account");
      }
      if (byEmail.oauthIssuer && byEmail.oauthSub) {
        if (byEmail.oauthIssuer !== issuer || byEmail.oauthSub !== sub) {
          throw new OidcLoginError("account_conflict");
        }
        user = byEmail;
      } else {
        if (byEmail.authProvider !== LEGACY_STAFF_AUTH_PROVIDER && byEmail.authProvider !== provider) {
          throw new OidcLoginError("account_conflict");
        }
        await this.storage.updateUser(byEmail.id, {
          oauthIssuer: issuer,
          oauthSub: sub,
          authProvider: provider,
          isEmailVerified: true,
        });
        user = (await this.storage.getUserById(byEmail.id))!;
      }
    }

    if (user.status === "pending") {
      throw new OidcLoginError("inactive", "Account is pending approval. Please wait for admin approval.");
    }
    if (user.status !== "active") {
      throw new OidcLoginError("inactive", "Account is suspended. Please contact support.");
    }
    if (user.tenantId) {
      const tenant = await this.storage.getTenant(user.tenantId);
      if (!tenant || tenant.status !== "active") {
        throw new OidcLoginError("tenant_inactive");
      }
    }

    const policy = await getTenantSecurityPolicy(user.tenantId);
    const gate = await staffMfaGate(this.storage, user, policy, () => this.generateToken());
    const payload = staffUserPayload(user);

    if (gate.kind === "mfa") {
      return { kind: "mfa", mfaChallengeToken: gate.mfaChallengeToken, user: payload };
    }
    if (gate.kind === "setup") {
      return { kind: "setup", setupToken: gate.setupToken, user: payload };
    }

    return {
      kind: "session",
      sessionToken: gate.sessionToken,
      sessionMaxAgeMs: gate.sessionMaxAgeMs,
      user: payload,
      redirectTo: gate.redirectTo,
    };
  }

  async createInvitedUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantId: string;
    employeeId: string | null;
    status: string;
  }) {
    const emailVerificationToken = this.generateToken();
    const user = await this.storage.createCustomUser({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as "admin" | "staff" | "operations" | "fleet_operator" | "super_admin" | null | undefined,
      tenantId: data.tenantId,
      employeeId: data.employeeId,
      authProvider: LEGACY_STAFF_AUTH_PROVIDER,
      status: data.status as "pending" | "active" | "blocked" | "decommissioned" | null | undefined,
      emailVerificationToken,
    });
    return user;
  }

  private async sendVerificationEmail(email: string, token: string) {
    const { sendEmail } = await import('../../notificationService');
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.FRONTEND_URL || 'http://localhost:17009';
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'Verify Your uventorybiz Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #142F5C;">Welcome to uventorybiz!</h2>
          <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${verificationUrl}" style="background-color: #FF4D4D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
          </div>
          <p>Or copy this link into your browser:</p>
          <p style="background: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all;">${verificationUrl}</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
          <p style="color: #666; font-size: 14px;">If you didn't create this account, please ignore this email.</p>
          <p style="color: #142F5C; font-size: 14px; margin-top: 24px; line-height: 1.6;">
            <strong>Commercial templates:</strong> printable agreements are at
            <a href="${baseUrl}/legal" style="color: #F6621E;">${baseUrl}/legal</a>.
            Organisation administrators can upload signed copies under
            <strong>Administration → Legal agreements</strong> after signing in.
          </p>
        </div>
      `
    });
  }

  private async sendVerificationSMS(phone: string, code: string) {
    const { sendSMS } = await import('../../notificationService');
    await sendSMS({
      to: phone,
      message: `Your uventorybiz verification code is: ${code}. Valid for 10 minutes.`
    });
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    const { sendEmail } = await import('../../notificationService');
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.FRONTEND_URL || 'http://localhost:17009';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      subject: 'Reset Your uventorybiz Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #142F5C;">Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetUrl}" style="background-color: #FF4D4D; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p>Or copy this link into your browser:</p>
          <p style="background: #f5f5f5; padding: 15px; border-radius: 5px; word-break: break-all;">${resetUrl}</p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
        </div>
      `
    });
  }
}