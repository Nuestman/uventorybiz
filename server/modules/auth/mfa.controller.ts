import { eq } from "drizzle-orm";
import type { IStorage } from "../../storage";
import type { AuthService } from "./auth.service";
import { LEGACY_STAFF_AUTH_PROVIDER } from "./auth.constants";
import { db } from "../../config/db";
import { users } from "@shared/schema";
import { getTenantSecurityPolicy } from "../security/security.repository";
import {
  buildOtpAuthUrl,
  deleteMfaChallenge,
  encryptTotpSecret,
  findValidMfaChallenge,
  generateBackupCodes,
  generateSecret,
  hashBackupCodes,
  verifyUserMfaCode,
} from "./mfa.service";

export function createMfaController(storage: IStorage, authService: AuthService) {
  return {
    async getStatus(userId: string) {
      const user = await storage.getUserById(userId);
      if (!user) return { ok: false as const, error: "User not found", code: "NOT_FOUND" as const };
      const policy = await getTenantSecurityPolicy(user.tenantId);
      return {
        ok: true as const,
        data: {
          mfaEnabled: !!user.mfaEnabled,
          tenantRequiresMfa: policy.requireMfa && !!user.tenantId,
        },
      };
    },

    async beginSetup(userId: string) {
      const user = await storage.getUserById(userId);
      if (!user?.email) return { ok: false as const, error: "User email required for MFA setup" };
      const secret = generateSecret();
      const encrypted = encryptTotpSecret(secret);
      await storage.updateUser(userId, { totpSecretEnc: encrypted, mfaEnabled: false, updatedAt: new Date() });
      return {
        ok: true as const,
        data: {
          otpauthUrl: buildOtpAuthUrl(user.email, secret),
          secret,
        },
      };
    },

    async confirmSetup(userId: string, code: string) {
      const user = await storage.getUserById(userId);
      if (!user?.totpSecretEnc) return { ok: false as const, error: "Start MFA setup first" };
      const verified = await verifyUserMfaCode(
        { id: user.id, totpSecretEnc: user.totpSecretEnc, mfaEnabled: false, mfaBackupCodes: user.mfaBackupCodes },
        code,
      );
      if (!verified.ok) return { ok: false as const, error: "Invalid verification code" };
      const plainCodes = generateBackupCodes();
      const hashed = await hashBackupCodes(plainCodes);
      await storage.updateUser(userId, { mfaEnabled: true, mfaBackupCodes: hashed, updatedAt: new Date() });
      return { ok: true as const, data: { success: true, backupCodes: plainCodes } };
    },

    async verifyLogin(challengeToken: string, code: string) {
      const challenge = await findValidMfaChallenge(challengeToken, "login");
      if (!challenge) return { ok: false as const, error: "Invalid or expired MFA challenge" };
      const user = await storage.getUserById(challenge.userId);
      if (!user) return { ok: false as const, error: "User not found" };
      const verified = await verifyUserMfaCode(user, code);
      if (!verified.ok) return { ok: false as const, error: "Invalid authentication code" };
      await deleteMfaChallenge(challengeToken);
      const login = await authService.completeStaffLoginAfterMfa(user.id);
      return { ok: true as const, data: login };
    },

    async beginSetupWithToken(setupToken: string) {
      const challenge = await findValidMfaChallenge(setupToken, "setup");
      if (!challenge) return { ok: false as const, error: "Invalid or expired setup token" };
      return this.beginSetup(challenge.userId);
    },

    async confirmSetupWithToken(setupToken: string, code: string) {
      const challenge = await findValidMfaChallenge(setupToken, "setup");
      if (!challenge) return { ok: false as const, error: "Invalid or expired setup token" };
      const result = await this.confirmSetup(challenge.userId, code);
      if (!result.ok) return result;
      await deleteMfaChallenge(setupToken);
      const login = await authService.completeStaffLoginAfterMfa(challenge.userId);
      return { ok: true as const, data: { ...result.data, ...login } };
    },

    async disable(userId: string, password: string, code: string) {
      const user = await storage.getUserById(userId);
      if (!user?.password || user.authProvider !== LEGACY_STAFF_AUTH_PROVIDER) {
        return { ok: false as const, error: "Password verification unavailable for this account" };
      }
      const policy = await getTenantSecurityPolicy(user.tenantId);
      if (policy.requireMfa && user.tenantId) {
        return { ok: false as const, error: "Your organization requires two-factor authentication" };
      }
      const okPw = await authService.verifyPassword(password, user.password);
      if (!okPw) return { ok: false as const, error: "Incorrect password" };
      const verified = await verifyUserMfaCode(user, code);
      if (!verified.ok) return { ok: false as const, error: "Invalid authentication code" };
      await db
        .update(users)
        .set({ mfaEnabled: false, totpSecretEnc: null, mfaBackupCodes: null, updatedAt: new Date() })
        .where(eq(users.id, userId));
      return { ok: true as const, data: { success: true } };
    },
  };
}
