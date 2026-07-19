import bcrypt from "bcrypt";
import type { IStorage } from "../../storage";
import { sendEmail } from "../../notificationService";
import * as portalRepo from "../portal/portal.repository";
import {
  approvePortalAccessRequest,
  rejectPortalAccessRequest,
  sendPortalUserMagicLink,
  updatePortalUserAccountStatus,
} from "../portal/portal-access-requests.service";
import { createPortalMagicTokenForUser } from "../portal/portal-auth.service";
import { MAGIC_TOKEN_MS } from "../portal/portal.repository";
import * as securityRepo from "../security/security.repository";
import type { TenantSecurityPolicy } from "../../shared/sessionPolicy";
import { getInvitationEmail, getRoleUpdateEmail, getApprovalEmail, getPortalAccessEmail } from "../../emailTemplates";
import { LEGACY_STAFF_AUTH_PROVIDER } from "../auth/auth.constants";
import {
  triggerHealthCheckManually,
  triggerMaintenanceReminderCheckManually,
  triggerOverdueMaintenanceReminderCheckManually,
  triggerDutySpawnManually,
} from "../../cronJobs";

export type AdminResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export function createAdminController(storage: IStorage) {
  const baseUrl = () =>
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.FRONTEND_URL || "http://localhost:17009";

  return {
    async initializeEmployees(adminUserId: string | undefined, adminTenantId: string | undefined) {
      try {
        const results = await storage.createDummyEmployeesForExistingUsers();
        if (adminUserId && adminTenantId) {
          await storage.auditAdminOperation(
            "initialize",
            "employees",
            "bulk-operation",
            adminUserId,
            adminTenantId,
            null,
            { employeesCreated: results.length, results },
            {
              performedBy: "Admin",
              initializationDate: new Date().toISOString(),
              employeeCount: results.length,
              adminAction: "Bulk employee initialization performed",
            }
          );
        }
        return { ok: true as const, data: { message: "Employee initialization completed", employeesCreated: results.length, results } };
      } catch (err) {
        console.error("Admin controller initializeEmployees:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to initialize employees" };
      }
    },

    async getPendingUsers(tenantId: string) {
      try {
        const data = await storage.getPendingUsers(tenantId);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Admin controller getPendingUsers:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch pending users" };
      }
    },

    async getAllUsers(tenantId: string) {
      try {
        const data = await storage.getAllUsers(tenantId);
        return { ok: true as const, data };
      } catch (err) {
        console.error("Admin controller getAllUsers:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch all users" };
      }
    },

    async inviteUser(
      adminTenantId: string,
      adminUser: { id?: string; firstName?: string; lastName?: string },
      body: { email: string; role?: string; employeeId?: string }
    ) {
      try {
        const { email, role, employeeId } = body;
        if (!email) return { ok: false as const, error: "Email is required" };
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return { ok: false as const, error: "Invalid email format" };
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) return { ok: false as const, error: "User with this email already exists" };
        const tenant = await storage.getTenant(adminTenantId);
        if (!tenant) return { ok: false as const, error: "Admin's tenant not found" };
        let employee: Awaited<ReturnType<IStorage["getEmployee"]>> | null = null;
        if (employeeId) {
          employee = await storage.getEmployee(employeeId, adminTenantId);
          if (!employee) return { ok: false as const, error: "Employee not found or does not belong to your tenant", code: "NOT_FOUND" };
          if (employee.email !== email) return { ok: false as const, error: "Employee email does not match provided email" };
          if (employee.email) {
            const existingEmployeeUser = await storage.getUserByEmail(employee.email);
            if (existingEmployeeUser) return { ok: false as const, error: "This employee already has a user account" };
          }
        }
        const crypto = await import("crypto");
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const userData = {
          email,
          firstName: employee?.firstName || email.split("@")[0],
          lastName: employee?.lastName || "Pending",
          role: role || "staff",
          status: "pending" as const,
          authProvider: LEGACY_STAFF_AUTH_PROVIDER,
          tenantId: adminTenantId,
          employeeId: employeeId || undefined,
          emailVerificationToken: verificationToken,
          isEmailVerified: false,
        };
        const user = await storage.createCustomUser(userData as Parameters<IStorage["createCustomUser"]>[0]);
        await storage.auditAdminOperation(
          "invite",
          "user",
          user.id,
          adminUser.id || "admin",
          adminTenantId,
          null,
          user,
          {
            invitedBy: adminUser.firstName ? `${adminUser.firstName} ${adminUser.lastName}` : "Admin",
            inviteDate: new Date().toISOString(),
            invitedEmail: email,
            assignedRole: role || "staff",
            tenantName: tenant.name,
            adminAction: "User invited to organization",
          }
        );
        const activationLink = `${baseUrl()}/api/auth/confirm-account?token=${verificationToken}`;
        await sendEmail({
          to: email,
          subject: `Welcome to uventorybiz - ${tenant.name}`,
          html: getInvitationEmail({
            firstName: employee?.firstName || email.split("@")[0],
            lastName: employee?.lastName || "User",
            role: role || "staff",
            activationLink,
            tenantName: tenant.name,
            tenantId: adminTenantId,
            inviterName: adminUser.firstName ? `${adminUser.firstName} ${adminUser.lastName}` : undefined,
            frontendBaseUrl: baseUrl(),
          }),
        });
        return { ok: true as const, data: { success: true, user } };
      } catch (err) {
        console.error("Admin controller inviteUser:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to invite user" };
      }
    },

    async inviteUsersBulk(
      adminTenantId: string,
      adminUser: { id?: string; firstName?: string; lastName?: string },
      invitations: { email: string; role?: string; employeeId?: string }[]
    ) {
      try {
        if (!Array.isArray(invitations) || invitations.length === 0) {
          return { ok: false as const, error: "invitations array is required and must not be empty" };
        }
        const tenant = await storage.getTenant(adminTenantId);
        if (!tenant) return { ok: false as const, error: "Admin's tenant not found" };
        const crypto = await import("crypto");
        const results: { email: string; success: boolean; error?: string }[] = [];
        for (const inv of invitations) {
          const email = inv.email?.trim();
          if (!email) {
            results.push({ email: inv.email || "", success: false, error: "Email is required" });
            continue;
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            results.push({ email, success: false, error: "Invalid email format" });
            continue;
          }
          const existingUser = await storage.getUserByEmail(email);
          if (existingUser) {
            results.push({ email, success: false, error: "User with this email already exists" });
            continue;
          }
          let employee: Awaited<ReturnType<IStorage["getEmployee"]>> | null = null;
          if (inv.employeeId) {
            employee = await storage.getEmployee(inv.employeeId, adminTenantId);
            if (!employee || employee.email !== email) {
              results.push({ email, success: false, error: "Employee not found or email mismatch" });
              continue;
            }
            const existingEmployeeUser = await storage.getUserByEmail(employee.email!);
            if (existingEmployeeUser) {
              results.push({ email, success: false, error: "This employee already has a user account" });
              continue;
            }
          }
          const verificationToken = crypto.randomBytes(32).toString("hex");
          const userData = {
            email,
            firstName: employee?.firstName || email.split("@")[0],
            lastName: employee?.lastName || "Pending",
            role: inv.role || "staff",
            status: "pending" as const,
            authProvider: LEGACY_STAFF_AUTH_PROVIDER,
            tenantId: adminTenantId,
            employeeId: inv.employeeId || undefined,
            emailVerificationToken: verificationToken,
            isEmailVerified: false,
          } as Parameters<IStorage["createCustomUser"]>[0];
          const user = await storage.createCustomUser(userData);
          await storage.auditAdminOperation(
            "invite",
            "user",
            user.id,
            adminUser.id || "admin",
            adminTenantId,
            null,
            user,
            {
              invitedBy: adminUser.firstName ? `${adminUser.firstName} ${adminUser.lastName}` : "Admin",
              inviteDate: new Date().toISOString(),
              invitedEmail: email,
              assignedRole: inv.role || "staff",
              tenantName: tenant.name,
              adminAction: "User invited to organization",
            }
          );
          const activationLink = `${baseUrl()}/api/auth/confirm-account?token=${verificationToken}`;
          await sendEmail({
            to: email,
            subject: `Welcome to uventorybiz - ${tenant.name}`,
            html: getInvitationEmail({
              firstName: employee?.firstName || email.split("@")[0],
              lastName: employee?.lastName || "User",
              role: inv.role || "staff",
              activationLink,
              tenantName: tenant.name,
              tenantId: adminTenantId,
              inviterName: adminUser.firstName ? `${adminUser.firstName} ${adminUser.lastName}` : undefined,
              frontendBaseUrl: baseUrl(),
            }),
          });
          results.push({ email, success: true });
        }
        const successCount = results.filter((r) => r.success).length;
        return { ok: true as const, data: { success: true, invited: successCount, total: invitations.length, results } };
      } catch (err) {
        console.error("Admin controller inviteUsersBulk:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to send invitations" };
      }
    },

    async resendVerification(userId: string, inviterName?: string) {
      try {
        const user = await storage.getUserById(userId);
        if (!user) return { ok: false as const, error: "User not found", code: "NOT_FOUND" };
        if (user.isEmailVerified) return { ok: false as const, error: "User email is already verified" };
        const crypto = await import("crypto");
        const verificationToken = crypto.randomBytes(32).toString("hex");
        await storage.updateUser(userId, { emailVerificationToken: verificationToken });
        const tenant = await storage.getTenant(user.tenantId!);
        if (!tenant) return { ok: false as const, error: "User's tenant not found" };
        const activationLink = `${baseUrl()}/api/auth/confirm-account?token=${verificationToken}`;
        await sendEmail({
          to: user.email!,
          subject: `Verify Your Account - ${tenant.name}`,
          html: getInvitationEmail({
            firstName: user.firstName || user.email?.split("@")[0] || "User",
            lastName: user.lastName || "User",
            role: user.role || "staff",
            activationLink,
            tenantName: tenant.name,
            tenantId: user.tenantId || "",
            inviterName,
            frontendBaseUrl: baseUrl(),
          }),
        });
        return { ok: true as const, data: { success: true, message: "Verification email resent successfully" } };
      } catch (err) {
        console.error("Admin controller resendVerification:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to resend verification email" };
      }
    },

    async approveUser(
      userId: string,
      adminUser: { id?: string; firstName?: string; lastName?: string }
    ) {
      try {
        const originalUser = await storage.getUserById(userId);
        if (!originalUser) return { ok: false as const, error: "User not found", code: "NOT_FOUND" };
        if (originalUser.tenantId) {
          const tenant = await storage.getTenant(originalUser.tenantId);
          if (!tenant || tenant.status !== "active") {
            return { ok: false as const, error: "Cannot approve this user until your organization is activated. Contact your administrator.", code: "FORBIDDEN" };
          }
        }
        const user = await storage.updateUser(userId, {
          status: "active",
          approvedAt: new Date(),
          approvedBy: adminUser.id,
        });
        await storage.auditAdminOperation(
          "approve",
          "user",
          userId,
          adminUser.id || "admin",
          user!.tenantId!,
          originalUser,
          user!,
          {
            approvedBy: adminUser.firstName ? `${adminUser.firstName} ${adminUser.lastName}` : "Admin",
            approvalDate: new Date().toISOString(),
            adminAction: "User account approved",
          }
        );
        if (user?.email) {
          const tenant = await storage.getTenant(user.tenantId!);
          await sendEmail({
            to: user.email,
            subject: `Account Approved - ${tenant?.name || "uventorybiz"}`,
            html: getApprovalEmail({
              firstName: user.firstName!,
              lastName: user.lastName!,
              tenantName: tenant?.name || "uventorybiz Organization",
              approvedBy: adminUser.firstName ? `${adminUser.firstName} ${adminUser.lastName}` : undefined,
            }),
          });
        }
        return { ok: true as const, data: { success: true, user } };
      } catch (err) {
        console.error("Admin controller approveUser:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to approve user" };
      }
    },

    async updateUserStatus(userId: string, status: string) {
      try {
        const user = await storage.updateUser(userId, { status: status as "pending" | "active" | "blocked" | "decommissioned" });
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: "Account Status Update - uventorybiz",
            html: `
              <h2>Account Status Update</h2>
              <p>Dear ${user.firstName} ${user.lastName},</p>
              <p>Your account status has been updated to: <strong>${status}</strong></p>
              <p>If you have any questions, please contact your system administrator.</p>
              <p>Best regards,<br>The uventorybiz Team</p>
            `,
          });
        }
        return { ok: true as const, data: { success: true, user } };
      } catch (err) {
        console.error("Admin controller updateUserStatus:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update user status" };
      }
    },

    async getNotificationRoleDefaults(tenantId: string, role: string) {
      try {
        if (!["staff", "operations", "fleet_operator", "admin"].includes(role)) return { ok: false as const, error: "Invalid role" };
        const defaults = await storage.getDefaultPreferencesForRole(tenantId, role);
        return { ok: true as const, data: { role, defaults } };
      } catch (err) {
        console.error("Admin controller getNotificationRoleDefaults:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch role defaults" };
      }
    },

    async applyRoleDefaults(tenantId: string, role: string, preferences: { notificationTypeId: string; channel: string; enabled?: boolean; minSeverity?: string | null }[]) {
      try {
        if (!role || !["staff", "operations", "fleet_operator", "admin"].includes(role)) return { ok: false as const, error: "Invalid role" };
        if (!Array.isArray(preferences)) return { ok: false as const, error: "Preferences must be an array" };
        const allUsers = await storage.getPendingUsers(tenantId);
        const targetUsers = allUsers.filter((u) => u.role === role && u.status === "active");
        if (targetUsers.length === 0) {
          return { ok: true as const, data: { success: true, message: "No users found with this role", updatedCount: 0 } };
        }
        let totalUpdated = 0;
        for (const pref of preferences) {
          await storage.bulkUpdateNotificationPreferences(
            tenantId,
            targetUsers.map((u) => u.id),
            pref.notificationTypeId,
            pref.channel,
            pref.enabled ?? true,
            pref.minSeverity ?? null,
            true
          );
          totalUpdated += targetUsers.length;
        }
        return { ok: true as const, data: { success: true, message: `Applied defaults to ${targetUsers.length} users`, updatedCount: totalUpdated } };
      } catch (err) {
        console.error("Admin controller applyRoleDefaults:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to apply role defaults" };
      }
    },

    async bulkUpdateNotificationPreferences(
      tenantId: string,
      body: { userIds: string[]; notificationTypeId: string; channel: string; enabled?: boolean; minSeverity?: string | null; adminManaged?: boolean }
    ) {
      try {
        const { userIds, notificationTypeId, channel, enabled, minSeverity, adminManaged } = body;
        if (!Array.isArray(userIds) || userIds.length === 0) return { ok: false as const, error: "userIds must be a non-empty array" };
        if (!notificationTypeId || !channel) return { ok: false as const, error: "notificationTypeId and channel are required" };
        const users = await Promise.all(userIds.map((id: string) => storage.getUser(id)));
        const invalidUsers = users.filter((u) => !u || u.tenantId !== tenantId);
        if (invalidUsers.length > 0) return { ok: false as const, error: "Some users do not belong to this tenant" };
        await storage.bulkUpdateNotificationPreferences(
          tenantId,
          userIds,
          notificationTypeId,
          channel,
          enabled ?? true,
          minSeverity ?? null,
          adminManaged ?? false
        );
        return { ok: true as const, data: { success: true, message: `Updated preferences for ${userIds.length} users`, updatedCount: userIds.length } };
      } catch (err) {
        console.error("Admin controller bulkUpdateNotificationPreferences:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to bulk update notification preferences" };
      }
    },

    async getNotificationPreferences(tenantId: string, userId: string) {
      try {
        const user = await storage.getUser(userId);
        if (!user || user.tenantId !== tenantId) return { ok: false as const, error: "User not found", code: "NOT_FOUND" };
        const preferences = await storage.getNotificationPreferences(userId, tenantId);
        const types = await storage.getNotificationTypes();
        const grouped = types.map((type) => {
          const typePrefs = preferences.filter((p) => p.notificationTypeId === type.id);
          const channels = ["email", "in_app", "sms", "whatsapp"].map((channel) => {
            const pref = typePrefs.find((p) => p.channel === channel);
            return {
              channel,
              enabled: pref?.enabled ?? false,
              minSeverity: pref?.minSeverity ?? null,
              adminManaged: pref?.adminManaged ?? false,
            };
          });
          return {
            notificationType: {
              id: type.id,
              key: type.key,
              displayName: type.displayName,
              category: type.category,
              severitySupported: type.severitySupported,
            },
            channels,
          };
        });
        return { ok: true as const, data: { userId, tenantId, preferences: grouped } };
      } catch (err) {
        console.error("Admin controller getNotificationPreferences:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch notification preferences" };
      }
    },

    async updateNotificationPreferences(tenantId: string, userId: string, preferences: { notificationTypeId: string; channel: string; enabled?: boolean; minSeverity?: string | null }[]) {
      try {
        const user = await storage.getUser(userId);
        if (!user || user.tenantId !== tenantId) return { ok: false as const, error: "User not found", code: "NOT_FOUND" };
        if (!Array.isArray(preferences)) return { ok: false as const, error: "Preferences must be an array" };
        const prefs = preferences.map((pref: { notificationTypeId: string; channel: string; enabled?: boolean; minSeverity?: string | null }) => ({
          notificationTypeId: pref.notificationTypeId,
          channel: pref.channel,
          enabled: pref.enabled ?? true,
          minSeverity: pref.minSeverity ?? null,
        }));
        await storage.updateNotificationPreferences(userId, tenantId, prefs);
        return { ok: true as const, data: { success: true, message: "Preferences updated successfully", updatedCount: prefs.length } };
      } catch (err) {
        console.error("Admin controller updateNotificationPreferences:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update notification preferences" };
      }
    },

    async updateUserRole(
      userId: string,
      role: string,
      adminUser: { id?: string; firstName?: string; lastName?: string }
    ) {
      try {
        if (!role || !["staff", "operations", "fleet_operator", "admin"].includes(role)) return { ok: false as const, error: "Invalid role" };
        const originalUser = await storage.getUserById(userId);
        if (!originalUser) return { ok: false as const, error: "User not found", code: "NOT_FOUND" };
        const updatedUser = await storage.updateUser(userId, {
          role: role as "staff" | "operations" | "fleet_operator" | "admin",
        });
        await storage.auditAdminOperation(
          "update_role",
          "user",
          userId,
          adminUser.id || "admin",
          updatedUser!.tenantId!,
          originalUser,
          updatedUser!,
          {
            previousRole: originalUser.role,
            newRole: role,
            updatedBy: adminUser.firstName ? `${adminUser.firstName} ${adminUser.lastName}` : "Admin",
            updateDate: new Date().toISOString(),
            adminAction: "User role updated",
          }
        );
        if (updatedUser?.email) {
          const tenant = await storage.getTenant(updatedUser.tenantId!);
          await sendEmail({
            to: updatedUser.email,
            subject: "Role Updated - uventorybiz",
            html: getRoleUpdateEmail({
              firstName: updatedUser.firstName!,
              lastName: updatedUser.lastName!,
              newRole: role,
              tenantName: tenant?.name || "uventorybiz Organization",
              updatedBy: adminUser.firstName ? `${adminUser.firstName} ${adminUser.lastName}` : undefined,
            }),
          });
        }
        return { ok: true as const, data: { success: true, user: updatedUser } };
      } catch (err) {
        console.error("Admin controller updateUserRole:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update user role" };
      }
    },

    async deleteUser(
      userId: string,
      tenantId: string,
      currentUserId: string,
      adminUser: { firstName?: string; lastName?: string }
    ) {
      try {
        const userToDelete = await storage.getUserById(userId);
        if (!userToDelete) return { ok: false as const, error: "User not found", code: "NOT_FOUND" };
        if (userToDelete.tenantId !== tenantId) return { ok: false as const, error: "Cannot delete users from other tenants", code: "FORBIDDEN" };
        if (userToDelete.id === currentUserId) return { ok: false as const, error: "Cannot delete your own account" };
        await storage.auditAdminOperation(
          "delete",
          "user",
          userId,
          currentUserId,
          tenantId,
          userToDelete,
          null,
          {
            deletedBy: adminUser?.firstName ? `${adminUser.firstName} ${adminUser.lastName}` : "Admin",
            deletionDate: new Date().toISOString(),
            deletedUserEmail: userToDelete.email,
            deletedUserName: `${userToDelete.firstName} ${userToDelete.lastName}`,
            adminAction: "User account deleted by Admin",
          }
        );
        await storage.deleteUser(userId);
        return { ok: true as const, data: { success: true } };
      } catch (err) {
        console.error("Admin controller deleteUser:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to delete user" };
      }
    },

    async triggerHealthCheck() {
      try {
        await triggerHealthCheckManually(storage as IStorage);
        return { ok: true as const, data: { success: true, message: "Equipment health check triggered successfully" } };
      } catch (err) {
        console.error("Admin controller triggerHealthCheck:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to trigger" };
      }
    },

    async triggerMaintenanceReminders() {
      try {
        await triggerMaintenanceReminderCheckManually(storage as IStorage);
        return { ok: true as const, data: { success: true, message: "Maintenance reminder check triggered successfully" } };
      } catch (err) {
        console.error("Admin controller triggerMaintenanceReminders:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to trigger" };
      }
    },

    async triggerOverdueMaintenanceReminders() {
      try {
        await triggerOverdueMaintenanceReminderCheckManually(storage as IStorage);
        return { ok: true as const, data: { success: true, message: "Overdue maintenance reminder check triggered successfully" } };
      } catch (err) {
        console.error("Admin controller triggerOverdueMaintenanceReminders:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to trigger" };
      }
    },

    async triggerDutySpawn() {
      try {
        const result = await triggerDutySpawnManually(storage as IStorage);
        return {
          ok: true as const,
          data: {
            success: true,
            message: `Duty spawn completed: ${result.totalSpawned} assignment(s) across ${result.tenantCount} tenant(s)`,
            tenantCount: result.tenantCount,
            totalSpawned: result.totalSpawned,
          },
        };
      } catch (err) {
        console.error("Admin controller triggerDutySpawn:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to trigger duty spawn" };
      }
    },

    async getPortalSettings(tenantId: string) {
      try {
        const tenant = await storage.getTenant(tenantId);
        if (!tenant) return { ok: false as const, error: "Tenant not found", code: "NOT_FOUND" as const };
        const row = await portalRepo.getTenantPortalSettingsRow(tenantId);
        const features = portalRepo.mergePortalFeatures(row?.featuresJson);
        return {
          ok: true as const,
          data: {
            enabled: row?.enabled ?? false,
            supportEmail: row?.supportEmail ?? null,
            privacyPolicyUrl: row?.privacyPolicyUrl ?? null,
            portalSlug: (tenant as { portalSlug?: string | null }).portalSlug ?? null,
            features,
            rawFeaturesJson: row?.featuresJson ?? {},
          },
        };
      } catch (err) {
        console.error("Admin getPortalSettings:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to load portal settings" };
      }
    },

    async updatePortalSettings(
      tenantId: string,
      body: {
        enabled: boolean;
        supportEmail?: string | null;
        privacyPolicyUrl?: string | null;
        portalSlug?: string | null;
        features?: Record<string, boolean>;
      },
    ) {
      try {
        const tenant = await storage.getTenant(tenantId);
        if (!tenant) return { ok: false as const, error: "Tenant not found", code: "NOT_FOUND" as const };
        if (body.portalSlug !== undefined) {
          const raw = body.portalSlug?.trim();
          if (raw) {
            const slug = raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
            if (slug.length < 2) {
              return { ok: false as const, error: "Portal slug must be at least 2 characters" };
            }
            const available = await portalRepo.isPortalSlugAvailableForTenant(tenantId, slug);
            if (!available) return { ok: false as const, error: "Portal slug is already in use" };
            await portalRepo.updateTenantPortalSlug(tenantId, slug);
          } else {
            await portalRepo.updateTenantPortalSlug(tenantId, null);
          }
        }
        await portalRepo.upsertTenantPortalSettings(tenantId, {
          enabled: body.enabled,
          supportEmail: body.supportEmail,
          privacyPolicyUrl: body.privacyPolicyUrl,
          ...(body.features !== undefined ? { featuresJson: body.features } : {}),
        });
        return { ok: true as const, data: { success: true } };
      } catch (err) {
        console.error("Admin updatePortalSettings:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to save portal settings" };
      }
    },

    async listPortalUsers(tenantId: string) {
      try {
        const rows = await portalRepo.listPortalUsersForTenant(tenantId);
        return {
          ok: true as const,
          data: rows.map((r) => {
            const partyLabel = r.customer
              ? `${r.customer.firstName} ${r.customer.lastName}`.trim()
              : r.supplier
                ? r.supplier.name
                : "—";
            return {
              id: r.portalUser.id,
              email: r.portalUser.email,
              status: r.portalUser.status,
              partyType: r.portalUser.partyType,
              customerId: r.portalUser.customerId,
              supplierId: r.portalUser.supplierId,
              createdAt: r.portalUser.createdAt,
              lastLoginAt: r.portalUser.lastLoginAt,
              partyName: partyLabel,
            };
          }),
        };
      } catch (err) {
        console.error("Admin listPortalUsers:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to list portal users" };
      }
    },

    async createPortalUser(
      tenantId: string,
      body: {
        partyType?: "customer" | "supplier";
        customerId?: string;
        supplierId?: string;
        email: string;
        password: string;
      },
    ) {
      try {
        const partyType = body.partyType ?? (body.supplierId ? "supplier" : "customer");
        const emailLower = body.email.trim().toLowerCase();
        const dupEmail = await portalRepo.findPortalUserByEmail(tenantId, emailLower);
        if (dupEmail) return { ok: false as const, error: "This email is already used for another portal account" };

        let firstName = emailLower.split("@")[0];
        let lastName = "";
        const customerId: string | null = body.customerId ?? null;
        const supplierId: string | null = body.supplierId ?? null;

        if (customerId) {
          const customer = await portalRepo.findCustomerById(tenantId, customerId);
          if (!customer) return { ok: false as const, error: "Customer not found", code: "NOT_FOUND" as const };
          const existing = await portalRepo.findPortalUserByCustomerId(tenantId, customerId);
          if (existing) {
            return { ok: false as const, error: "A portal account already exists for this customer" };
          }
          firstName = customer.firstName;
          lastName = customer.lastName;
        } else if (supplierId) {
          const supplier = await portalRepo.findSupplierById(tenantId, supplierId);
          if (!supplier) return { ok: false as const, error: "Supplier not found", code: "NOT_FOUND" as const };
          const existing = await portalRepo.findPortalUserBySupplierId(tenantId, supplierId);
          if (existing) {
            return { ok: false as const, error: "A portal account already exists for this supplier" };
          }
          firstName = supplier.contactName?.split(/\s+/)[0] ?? supplier.name;
          lastName = supplier.contactName?.split(/\s+/).slice(1).join(" ") ?? "";
        } else {
          return { ok: false as const, error: "Link portal account to a customer or supplier record" };
        }

        const tenant = await storage.getTenant(tenantId);
        if (!tenant) return { ok: false as const, error: "Organization not found", code: "NOT_FOUND" as const };
        const portalSettings = await portalRepo.getTenantPortalSettingsRow(tenantId);
        if (!portalSettings?.enabled) {
          return {
            ok: false as const,
            error: "Customer/supplier portal is disabled. Enable it in Settings before creating accounts.",
          };
        }
        const passwordHash = await bcrypt.hash(body.password, 12);
        const portalUser = await portalRepo.createPortalUserRecord({
          tenantId,
          partyType,
          customerId,
          supplierId,
          emailLower,
          passwordHash,
        });

        const magicLink = await createPortalMagicTokenForUser(portalUser.id);
        const slug = tenant.portalSlug?.trim();
        const loginUrl = slug
          ? `${baseUrl()}/portal/login?org=${encodeURIComponent(slug)}`
          : `${baseUrl()}/portal/login`;
        const emailSent = await sendEmail({
          to: emailLower,
          subject: `Your portal account — ${tenant.name}`,
          html: getPortalAccessEmail({
            firstName,
            lastName,
            tenantName: tenant.name,
            magicLink,
            loginUrl,
            email: emailLower,
            temporaryPassword: body.password,
            supportEmail: portalSettings.supportEmail,
            privacyPolicyUrl: portalSettings.privacyPolicyUrl,
            expiresMinutes: Math.round(MAGIC_TOKEN_MS / 60000),
          }),
        });

        return { ok: true as const, data: { success: true, emailSent } };
      } catch (err) {
        console.error("Admin createPortalUser:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to create portal user" };
      }
    },

    async deletePortalUser(tenantId: string, portalUserId: string) {
      try {
        const ok = await portalRepo.deletePortalUser(portalUserId, tenantId);
        if (!ok) return { ok: false as const, error: "Portal user not found", code: "NOT_FOUND" as const };
        return { ok: true as const, data: { success: true } };
      } catch (err) {
        console.error("Admin deletePortalUser:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to delete portal user" };
      }
    },

    async listPortalAccessRequests(tenantId: string, status?: string) {
      try {
        const rows = await portalRepo.listPortalAccessRequestsForTenant(tenantId, status);
        return {
          ok: true as const,
          data: rows.map((r) => ({
            id: r.request.id,
            email: r.request.email,
            status: r.request.status,
            requestKind: r.request.requestKind,
            matchKind: r.request.matchKind,
            customerId: r.request.customerId,
            supplierId: r.request.supplierId,
            partyType: r.request.supplierId ? "supplier" : r.request.customerId ? "customer" : null,
            partyName: r.customer
              ? `${r.customer.firstName} ${r.customer.lastName}`.trim()
              : r.supplier
                ? r.supplier.name
                : null,
            partyNumber: r.customer?.customerNumber ?? null,
            reviewerNotes: r.request.reviewerNotes,
            reviewedAt: r.request.reviewedAt,
            createdAt: r.request.createdAt,
          })),
        };
      } catch (err) {
        console.error("Admin listPortalAccessRequests:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to list access requests" };
      }
    },

    async approvePortalAccessRequest(
      tenantId: string,
      requestId: string,
      reviewerUserId: string,
      body: { password?: string; notes?: string | null },
    ) {
      try {
        const result = await approvePortalAccessRequest({
          storage,
          tenantId,
          requestId,
          reviewerUserId,
          password: body.password,
          notes: body.notes,
        });
        if (!result.ok) return { ok: false as const, error: result.error };
        return { ok: true as const, data: { success: true } };
      } catch (err) {
        console.error("Admin approvePortalAccessRequest:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to approve request" };
      }
    },

    async rejectPortalAccessRequest(
      tenantId: string,
      requestId: string,
      reviewerUserId: string,
      body: { notes?: string | null },
    ) {
      try {
        const result = await rejectPortalAccessRequest({
          tenantId,
          requestId,
          reviewerUserId,
          notes: body.notes,
        });
        if (!result.ok) return { ok: false as const, error: result.error };
        return { ok: true as const, data: { success: true } };
      } catch (err) {
        console.error("Admin rejectPortalAccessRequest:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to reject request" };
      }
    },

    async updatePortalUserStatus(tenantId: string, portalUserId: string, status: "active" | "suspended") {
      try {
        const result = await updatePortalUserAccountStatus({ tenantId, portalUserId, status });
        if (!result.ok) return { ok: false as const, error: result.error, code: "NOT_FOUND" as const };
        return { ok: true as const, data: { success: true, status } };
      } catch (err) {
        console.error("Admin updatePortalUserStatus:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update portal account" };
      }
    },

    async resendPortalUserMagicLink(tenantId: string, portalUserId: string) {
      try {
        const result = await sendPortalUserMagicLink({ storage, tenantId, portalUserId });
        if (!result.ok) return { ok: false as const, error: result.error };
        return { ok: true as const, data: { success: true, emailSent: result.emailSent } };
      } catch (err) {
        console.error("Admin resendPortalUserMagicLink:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to send magic link" };
      }
    },

    async getSecuritySettings(tenantId: string) {
      try {
        const policy = await securityRepo.getTenantSecurityPolicy(tenantId);
        return { ok: true as const, data: policy };
      } catch (err) {
        console.error("Admin getSecuritySettings:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to load security settings" };
      }
    },

    async updateSecuritySettings(tenantId: string, body: Partial<TenantSecurityPolicy>) {
      try {
        const merged = await securityRepo.upsertTenantSecuritySettings(tenantId, {
          staffSessionAbsoluteHours: body.staffSessionAbsoluteHours,
          staffSessionIdleMinutes: body.staffSessionIdleMinutes,
          portalSessionAbsoluteDays: body.portalSessionAbsoluteDays,
          portalSessionIdleMinutes: body.portalSessionIdleMinutes,
          portalSessionSlidingDays: body.portalSessionSlidingDays,
          sessionWarningLeadMinutes: body.sessionWarningLeadMinutes,
          idleTimeoutEnabled: body.idleTimeoutEnabled,
          requireMfa: body.requireMfa,
        });
        return { ok: true as const, data: merged };
      } catch (err) {
        console.error("Admin updateSecuritySettings:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update security settings" };
      }
    },
  };
}

export type AdminController = ReturnType<typeof createAdminController>;
