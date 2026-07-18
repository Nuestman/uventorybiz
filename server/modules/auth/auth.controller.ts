import type { IStorage } from "../../storage";
import type { AuthService } from "./auth.service";

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export function createAuthController(storage: IStorage, authService: AuthService) {
  return {
    async register(data: Parameters<AuthService["registerUser"]>[0]) {
      try {
        const result = await authService.registerUser(data);
        return { ok: true as const, data: result };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : "Registration failed" };
      }
    },

    async login(data: Parameters<AuthService["loginUser"]>[0]) {
      try {
        const result = await authService.loginUser(data);
        return { ok: true as const, data: result };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : "Login failed" };
      }
    },

    async verifyEmail(data: Parameters<AuthService["verifyEmail"]>[0]) {
      try {
        const result = await authService.verifyEmail(data);
        return { ok: true as const, data: result };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : "Verification failed" };
      }
    },

    async forgotPassword(data: Parameters<AuthService["forgotPassword"]>[0]) {
      try {
        const result = await authService.forgotPassword(data);
        return { ok: true as const, data: result };
      } catch (err) {
        return { ok: false as const, error: "Failed to process request" };
      }
    },

    async resetPassword(data: Parameters<AuthService["resetPassword"]>[0]) {
      try {
        const result = await authService.resetPassword(data);
        return { ok: true as const, data: result };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : "Password reset failed" };
      }
    },

    async changePassword(userId: string, data: Parameters<AuthService["changePassword"]>[1]) {
      try {
        const result = await authService.changePassword(userId, data);
        return { ok: true as const, data: result };
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : "Password change failed" };
      }
    },

    async logout(sessionToken: string | undefined) {
      try {
        if (sessionToken) await authService.logout(sessionToken);
        return { ok: true as const, data: { success: true, message: "Logged out successfully" } };
      } catch {
        return { ok: true as const, data: { success: true, message: "Logged out successfully" } };
      }
    },

    async selectLocation(params: {
      tenantId: string;
      userId: string | undefined;
      locationId: string;
      reason?: string;
      sessionToken: string;
      performedBy?: string;
    }) {
      try {
        const { tenantId, userId, locationId, reason, sessionToken, performedBy } = params;
        const location = await storage.getCareLocation(locationId, tenantId);
        if (!location) return { ok: false as const, error: "Location not found", code: "NOT_FOUND" as const };
        if (location.status !== "active") return { ok: false as const, error: "Location is not active" };
        await storage.setSessionLocation(sessionToken, locationId, location.locationName);
        await storage.auditAdminOperation(
          "location_selected",
          "session",
          sessionToken,
          userId ?? "system",
          tenantId,
          null,
          { locationId, locationName: location.locationName, reason },
          { performedBy: performedBy || "User", action: "Selected working location", locationName: location.locationName, reason: reason || "Starting shift" }
        );
        return {
          ok: true as const,
          data: {
            success: true,
            activeLocation: { id: location.id, name: location.locationName, code: location.locationCode },
            message: `Working location set to: ${location.locationName}`,
          },
        };
      } catch (err) {
        console.error("Auth controller selectLocation:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to set working location" };
      }
    },

    async switchLocation(params: {
      tenantId: string;
      userId: string | undefined;
      newLocationId: string;
      reason?: string;
      sessionToken: string;
      performedBy?: string;
    }) {
      try {
        const { tenantId, userId, newLocationId, reason, sessionToken, performedBy } = params;
        const currentSession = await storage.getUserSession(sessionToken);
        const previousLocationId = currentSession?.activeLocationId;
        const previousLocationName = currentSession?.activeLocationName;
        const newLocation = await storage.getCareLocation(newLocationId, tenantId);
        if (!newLocation) return { ok: false as const, error: "New location not found", code: "NOT_FOUND" as const };
        if (newLocation.status !== "active") return { ok: false as const, error: "New location is not active" };
        await storage.setSessionLocation(sessionToken, newLocationId, newLocation.locationName);
        await storage.auditAdminOperation(
          "location_switched",
          "session",
          sessionToken,
          userId ?? "system",
          tenantId,
          { previousLocationId, previousLocationName },
          { newLocationId, newLocationName: newLocation.locationName, reason },
          { performedBy: performedBy || "User", action: "Switched working location", from: previousLocationName || "Unknown", to: newLocation.locationName, reason: reason || "Location change", switchedAt: new Date().toISOString() }
        );
        return {
          ok: true as const,
          data: {
            success: true,
            previousLocation: previousLocationId ? { id: previousLocationId, name: previousLocationName } : null,
            newLocation: { id: newLocation.id, name: newLocation.locationName, code: newLocation.locationCode },
            switchedAt: new Date().toISOString(),
          },
        };
      } catch (err) {
        console.error("Auth controller switchLocation:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to switch location" };
      }
    },

    async getCurrentSession(sessionToken: string, user: { id?: string; email?: string; firstName?: string; lastName?: string; role?: string; tenantId?: string } | undefined) {
      try {
        const session = await storage.getUserSession(sessionToken);
        if (!session) return { ok: false as const, error: "Invalid session", code: "UNAUTHORIZED" as const };
        const tenant = user?.tenantId ? await storage.getTenant(user.tenantId) : null;
        let activeLocation = null;
        if (session.activeLocationId && user?.tenantId) {
          const loc = await storage.getCareLocation(session.activeLocationId, user.tenantId);
          if (loc) activeLocation = { id: loc.id, name: loc.locationName, code: loc.locationCode };
        }
        return {
          ok: true as const,
          data: {
            user: user ? { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, tenantId: user.tenantId } : undefined,
            tenant: tenant ? { id: tenant.id, name: tenant.name, hasMultipleLocations: tenant.hasMultipleLocations || false } : null,
            activeLocation,
            sessionStart: session.createdAt,
          },
        };
      } catch (err) {
        console.error("Auth controller getCurrentSession:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch session details" };
      }
    },

    async updateProfile(userId: string, updates: { firstName?: string; lastName?: string; email?: string; phone?: string; bio?: string; profileImageUrl?: string }) {
      try {
        const data = await storage.updateUserProfile(userId, updates);
        return { ok: true as const, data: data! };
      } catch (err) {
        console.error("Auth controller updateProfile:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update profile" };
      }
    },

    async getActivationDetails(token: string) {
      try {
        const user = await storage.getUserByVerificationToken(token);
        if (!user) return { ok: false as const, error: "Invalid or expired verification token" };
        const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;
        const tenantActive = !user.tenantId || (tenant?.status === "active");
        return {
          ok: true as const,
          data: {
            success: true,
            email: user.email,
            role: user.role,
            tenantName: tenant?.name || "Unknown Organization",
            tenantId: user.tenantId,
            tenantActive,
          },
        };
      } catch (err) {
        console.error("Auth controller getActivationDetails:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to get activation details" };
      }
    },

    async completeActivation(params: { token: string; firstName?: string; lastName?: string; phoneNumber?: string; password: string }) {
      try {
        const { token, firstName, lastName, phoneNumber, password } = params;
        const user = await storage.getUserByVerificationToken(token);
        if (!user) return { ok: false as const, error: "Invalid or expired verification token" };
        if (user.tenantId) {
          const tenant = await storage.getTenant(user.tenantId);
          if (!tenant || tenant.status !== "active") {
            return { ok: false as const, error: "Your organization has not been activated yet. You cannot activate your account until an administrator activates your organization. Please contact support.", code: "FORBIDDEN" as const };
          }
        }
        if (phoneNumber) {
          const existing = await storage.getUserByEmailOrPhone("", phoneNumber);
          if (existing && existing.id !== user.id) return { ok: false as const, error: "Phone number already in use" };
        }
        const bcrypt = await import("bcrypt");
        const hashedPassword = await bcrypt.hash(password, 12);
        await storage.updateUser(user.id, {
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
          password: hashedPassword,
          isEmailVerified: true,
          status: "active",
          emailVerificationToken: null,
          approvedAt: new Date(),
        });
        return { ok: true as const, data: { success: true, message: "Account activated successfully" } };
      } catch (err) {
        console.error("Auth controller completeActivation:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to complete activation" };
      }
    },

    async confirmAccount(token: string) {
      try {
        const user = await storage.getUserByVerificationToken(token);
        if (!user) return { ok: false as const, error: "Invalid or expired verification token" };
        return { ok: true as const, data: { redirectToken: token } };
      } catch (err) {
        console.error("Auth controller confirmAccount:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to confirm account" };
      }
    },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
