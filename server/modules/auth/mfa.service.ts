import crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import bcrypt from "bcrypt";
import { and, eq, gte } from "drizzle-orm";
import { db } from "../../config/db";
import { mfaChallenges, users } from "@shared/schema";
import { MFA_CHALLENGE_MS } from "../../shared/sessionPolicy";

function encryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || process.env.MFA_ENCRYPTION_KEY || "dev-mfa-key-change-me";
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptTotpSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptTotpSecret(stored: string): string {
  const [ivHex, tagHex, dataHex] = stored.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid MFA secret format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return dec.toString("utf8");
}

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () => crypto.randomBytes(4).toString("hex"));
}

export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => bcrypt.hash(c, 10)));
}

export function buildOtpAuthUrl(email: string, secret: string, issuer = "uventorybiz"): string {
  return generateURI({ issuer, label: email, secret });
}

export function verifyTotpCode(secret: string, token: string): boolean {
  return verifySync({ secret, token: token.replace(/\s/g, "") }).valid;
}

export { generateSecret };

export async function createMfaChallenge(userId: string, purpose: "login" | "setup", token: string) {
  const expires = new Date(Date.now() + MFA_CHALLENGE_MS);
  await db.delete(mfaChallenges).where(and(eq(mfaChallenges.userId, userId), eq(mfaChallenges.purpose, purpose)));
  await db.insert(mfaChallenges).values({ userId, purpose, token, expires });
  return expires;
}

export async function findValidMfaChallenge(token: string, purpose: "login" | "setup") {
  const now = new Date();
  const [row] = await db
    .select()
    .from(mfaChallenges)
    .where(
      and(eq(mfaChallenges.token, token), eq(mfaChallenges.purpose, purpose), gte(mfaChallenges.expires, now)),
    )
    .limit(1);
  return row;
}

export async function deleteMfaChallenge(token: string) {
  await db.delete(mfaChallenges).where(eq(mfaChallenges.token, token));
}

export async function verifyUserMfaCode(
  user: {
    id: string;
    totpSecretEnc: string | null;
    mfaEnabled: boolean | null;
    mfaBackupCodes: unknown;
  },
  code: string,
): Promise<{ ok: true; usedBackup: boolean } | { ok: false }> {
  const normalized = code.replace(/\s/g, "");
  if (user.totpSecretEnc) {
    try {
      const secret = decryptTotpSecret(user.totpSecretEnc);
      if (verifyTotpCode(secret, normalized)) return { ok: true, usedBackup: false };
    } catch {
      /* fall through to backup codes */
    }
  }
  if (!user.mfaEnabled) return { ok: false };
  const backups = Array.isArray(user.mfaBackupCodes) ? (user.mfaBackupCodes as string[]) : [];
  for (let i = 0; i < backups.length; i++) {
    const hash = backups[i];
    if (typeof hash === "string" && (await bcrypt.compare(normalized, hash))) {
      const next = backups.filter((_, idx) => idx !== i);
      await db.update(users).set({ mfaBackupCodes: next, updatedAt: new Date() }).where(eq(users.id, user.id));
      return { ok: true, usedBackup: true };
    }
  }
  return { ok: false };
}
