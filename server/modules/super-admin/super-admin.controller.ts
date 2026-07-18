import type { IStorage } from "../../storage";
import type { AuthService } from "../auth/auth.service";
import { sendEmail } from "../../notificationService";
import { getInvitationEmail } from "../../emailTemplates";

export type SuperAdminResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export function createSuperAdminController(storage: IStorage, authService: AuthService) {
  const frontendBaseUrl = () =>
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.FRONTEND_URL || "http://localhost:17009";

  return {
    async getTenants() {
      try {
        const data = await storage.getAllTenantsWithUserCounts();
        return { ok: true as const, data };
      } catch (err) {
        console.error("SuperAdmin controller getTenants:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch tenants" };
      }
    },

    async getFeedback() {
      try {
        const data = await storage.getAllFeedbackForAdmin();
        return { ok: true as const, data };
      } catch (err) {
        console.error("SuperAdmin controller getFeedback:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch feedback" };
      }
    },

    async updateFeedback(id: string, body: { status?: string; adminNote?: string }) {
      try {
        const data = await storage.updateFeedbackStatusAndNote(id, body);
        if (!data) return { ok: false as const, error: "Feedback not found", code: "NOT_FOUND" };
        return { ok: true as const, data };
      } catch (err) {
        console.error("SuperAdmin controller updateFeedback:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update feedback" };
      }
    },

    async getTenantAdmins() {
      try {
        const data = await storage.getAllTenantAdmins();
        return { ok: true as const, data };
      } catch (err) {
        console.error("SuperAdmin controller getTenantAdmins:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch tenant admins" };
      }
    },

    async getUsersGroupedByTenant() {
      try {
        const data = await storage.getAllUsersGroupedByTenant();
        return { ok: true as const, data };
      } catch (err) {
        console.error("SuperAdmin controller getUsersGroupedByTenant:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to fetch users" };
      }
    },

    async approveAdmin(adminId: string, performedBy: { id?: string; firstName?: string; lastName?: string }) {
      try {
        const originalAdmin = await storage.getUserById(adminId);
        const updatedAdmin = await storage.approveTenantAdmin(adminId, performedBy.id || "super-admin");
        const tenant = updatedAdmin.tenantId ? await storage.getTenant(updatedAdmin.tenantId) : null;
        if (originalAdmin) {
          await storage.auditAdminOperation(
            "approve_admin",
            "tenant_admin",
            adminId,
            performedBy.id || "super-admin",
            updatedAdmin.tenantId!,
            originalAdmin,
            updatedAdmin,
            {
              approvedBy: performedBy.firstName ? `${performedBy.firstName} ${performedBy.lastName}` : "Super Admin",
              approvalDate: new Date().toISOString(),
              tenantName: tenant?.name || "Unknown",
              superAdminAction: "Tenant admin account approved",
            }
          );
        }
        try {
          if (updatedAdmin.email && updatedAdmin.firstName && updatedAdmin.lastName) {
            await sendEmail({
              to: updatedAdmin.email,
              subject: "Your Admin Account Has Been Approved - uventorybiz",
              html: getInvitationEmail({
                firstName: updatedAdmin.firstName,
                lastName: updatedAdmin.lastName,
                role: "admin",
                tenantName: tenant?.name || "Your organization",
                activationLink: "#",
                inviterName: "uventorybiz Super Admin",
                frontendBaseUrl: frontendBaseUrl(),
              }),
            });
          }
        } catch (emailErr) {
          console.error("Failed to send approval email:", emailErr);
        }
        return { ok: true as const, data: updatedAdmin };
      } catch (err) {
        console.error("SuperAdmin controller approveAdmin:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to approve admin" };
      }
    },

    async createTenant(
      body: {
        name: string;
        description?: string;
        contactEmail?: string;
        contactPhone?: string;
        address?: string;
        planType?: string;
        adminEmail: string;
        adminFirstName: string;
        adminLastName: string;
      },
      hostname: string
    ) {
      try {
        const { name, contactEmail, contactPhone, address, planType, adminEmail, adminFirstName, adminLastName } = body;
        const tenant = await storage.createTenant({
          name,
          contactEmail: contactEmail ?? "",
          contactPhone,
          address,
          planType,
          status: "active",
        });
        await storage.getOrCreateDefaultCompany(tenant.id, tenant.contactEmail ?? undefined);
        const adminUser = await authService.createInvitedUser({
          email: adminEmail,
          firstName: adminFirstName,
          lastName: adminLastName,
          role: "admin",
          tenantId: tenant.id,
          employeeId: null,
          status: "pending",
        });
        await sendEmail({
          to: adminEmail,
          subject: `Welcome to uventorybiz - ${tenant.name}`,
          html: getInvitationEmail({
            firstName: adminFirstName,
            lastName: adminLastName,
            role: "admin",
            tenantName: tenant.name,
            activationLink: `https://${hostname}/api/auth/confirm-account?token=${adminUser.emailVerificationToken}`,
            inviterName: "The uventorybiz Team",
            frontendBaseUrl: frontendBaseUrl(),
          }),
        });
        return {
          ok: true as const,
          data: {
            success: true,
            tenant,
            adminUser: {
              id: adminUser.id,
              email: adminUser.email,
              firstName: adminUser.firstName,
              lastName: adminUser.lastName,
              role: adminUser.role,
            },
          },
        };
      } catch (err) {
        console.error("SuperAdmin controller createTenant:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to create tenant" };
      }
    },

    async updateUser(
      userId: string,
      updates: Record<string, unknown>,
      performedBy: { id?: string; firstName?: string; lastName?: string }
    ) {
      try {
        const originalUser = await storage.getUserById(userId);
        if (!originalUser) return { ok: false as const, error: "User not found", code: "NOT_FOUND" };
        if (updates.status === "active" && originalUser.tenantId) {
          const tenant = await storage.getTenant(originalUser.tenantId);
          if (!tenant || tenant.status !== "active") {
            return {
              ok: false as const,
              error: "Cannot activate this user until their organization is activated. Activate the tenant first, then approve the user.",
              code: "FORBIDDEN",
            };
          }
        }
        const updatedUser = await storage.updateUser(userId, updates);
        await storage.auditAdminOperation(
          "update_user",
          "user",
          userId,
          performedBy.id || "super-admin",
          updatedUser!.tenantId!,
          originalUser,
          updatedUser!,
          {
            updatedBy: performedBy.firstName ? `${performedBy.firstName} ${performedBy.lastName}` : "Super Admin",
            updateDate: new Date().toISOString(),
            changedFields: Object.keys(updates),
            superAdminAction: "User account updated by Super Admin",
          }
        );
        return { ok: true as const, data: { success: true, user: updatedUser } };
      } catch (err) {
        console.error("SuperAdmin controller updateUser:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update user" };
      }
    },

    async deleteUser(userId: string, performedBy: { id?: string; firstName?: string; lastName?: string }) {
      try {
        const originalUser = await storage.getUserById(userId);
        if (!originalUser) return { ok: false as const, error: "User not found", code: "NOT_FOUND" };
        await storage.deleteUser(userId);
        await storage.auditAdminOperation(
          "delete_user",
          "user",
          userId,
          performedBy.id || "super-admin",
          originalUser.tenantId!,
          originalUser,
          null,
          {
            deletedBy: performedBy.firstName ? `${performedBy.firstName} ${performedBy.lastName}` : "Super Admin",
            deletionDate: new Date().toISOString(),
            deletedUserEmail: originalUser.email,
            deletedUserName: `${originalUser.firstName} ${originalUser.lastName}`,
            superAdminAction: "User account deleted by Super Admin",
          }
        );
        return { ok: true as const, data: { success: true } };
      } catch (err) {
        console.error("SuperAdmin controller deleteUser:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to delete user" };
      }
    },

    async updateTenantAdmin(
      adminId: string,
      updates: Record<string, unknown>,
      performedBy: { id?: string; firstName?: string; lastName?: string }
    ) {
      try {
        const originalAdmin = await storage.getUserById(adminId);
        if (!originalAdmin) return { ok: false as const, error: "Admin not found", code: "NOT_FOUND" };
        const updatedAdmin = await storage.updateUser(adminId, updates);
        await storage.auditAdminOperation(
          "update",
          "tenant_admin",
          adminId,
          performedBy.id || "super-admin",
          updatedAdmin!.tenantId || "system",
          originalAdmin,
          updatedAdmin!,
          {
            updatedBy: performedBy.firstName ? `${performedBy.firstName} ${performedBy.lastName}` : "Super Admin",
            updateDate: new Date().toISOString(),
            superAdminAction: "Tenant admin account updated",
          }
        );
        return { ok: true as const, data: updatedAdmin };
      } catch (err) {
        console.error("SuperAdmin controller updateTenantAdmin:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update tenant admin" };
      }
    },

    async deleteTenantAdmin(
      adminId: string,
      performedBy: { id?: string; firstName?: string; lastName?: string }
    ) {
      try {
        const originalAdmin = await storage.getUserById(adminId);
        if (!originalAdmin) return { ok: false as const, error: "Admin not found", code: "NOT_FOUND" };
        await storage.deleteUser(adminId);
        await storage.auditAdminOperation(
          "delete",
          "tenant_admin",
          adminId,
          performedBy.id || "super-admin",
          originalAdmin.tenantId || "system",
          originalAdmin,
          null,
          {
            deletedBy: performedBy.firstName ? `${performedBy.firstName} ${performedBy.lastName}` : "Super Admin",
            deletionDate: new Date().toISOString(),
            superAdminAction: "Tenant admin account permanently deleted",
          }
        );
        return { ok: true as const, data: { message: "Tenant admin deleted successfully" } };
      } catch (err) {
        console.error("SuperAdmin controller deleteTenantAdmin:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to delete tenant admin" };
      }
    },

    async updateTenantStatus(
      tenantId: string,
      status: string,
      host: string
    ) {
      try {
        const tenant = await storage.updateTenantStatus(tenantId, status);
        if (status === "active") {
          const admins = await storage.getTenantAdmins(tenantId);
          for (const admin of admins) {
            if (admin.email && admin.role === "admin") {
              try {
                await sendEmail({
                  to: admin.email,
                  subject: "Your Organization Has Been Approved - Welcome to uventorybiz!",
                  html: getInvitationEmail({
                    firstName: admin.firstName || "Admin",
                    lastName: admin.lastName || "User",
                    role: admin.role || "admin",
                    tenantName: tenant.name,
                    activationLink: `https://${host}/`,
                    tenantId: admin.tenantId || "",
                    inviterName: "uventorybiz Super Admin",
                    frontendBaseUrl: frontendBaseUrl(),
                  }),
                });
              } catch (emailErr) {
                console.error("Failed to send tenant approval email:", emailErr);
              }
            }
          }
        }
        return { ok: true as const, data: { success: true, tenant } };
      } catch (err) {
        console.error("SuperAdmin controller updateTenantStatus:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update tenant status" };
      }
    },

    async updateTenantPlan(
      tenantId: string,
      planType: string,
      performedBy: { id?: string; firstName?: string; lastName?: string }
    ) {
      try {
        const originalTenant = await storage.getTenant(tenantId);
        if (!originalTenant) return { ok: false as const, error: "Tenant not found", code: "NOT_FOUND" };
        const updatedTenant = await storage.updateTenantPlan(tenantId, planType);
        await storage.auditAdminOperation(
          "update_plan",
          "tenant",
          tenantId,
          performedBy.id || "super-admin",
          tenantId,
          originalTenant,
          updatedTenant!,
          {
            updatedBy: performedBy.firstName ? `${performedBy.firstName} ${performedBy.lastName}` : "Super Admin",
            updateDate: new Date().toISOString(),
            oldPlan: originalTenant.planType,
            newPlan: planType,
            superAdminAction: "Tenant plan updated by Super Admin",
          }
        );
        return { ok: true as const, data: { success: true, tenant: updatedTenant } };
      } catch (err) {
        console.error("SuperAdmin controller updateTenantPlan:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update tenant plan" };
      }
    },

    async updateTenant(
      tenantId: string,
      updateData: Record<string, unknown>,
      performedBy: { id?: string; firstName?: string; lastName?: string }
    ) {
      try {
        const originalTenant = await storage.getTenant(tenantId);
        if (!originalTenant) return { ok: false as const, error: "Tenant not found", code: "NOT_FOUND" };
        const updatedTenant = await storage.updateTenant(tenantId, updateData);
        await storage.auditAdminOperation(
          "update",
          "tenant",
          tenantId,
          performedBy.id || "super-admin",
          tenantId,
          originalTenant,
          updatedTenant!,
          {
            updatedBy: performedBy.firstName ? `${performedBy.firstName} ${performedBy.lastName}` : "Super Admin",
            updateDate: new Date().toISOString(),
            changes: updateData,
            action: "Tenant settings updated by Super Admin",
          }
        );
        return { ok: true as const, data: updatedTenant };
      } catch (err) {
        console.error("SuperAdmin controller updateTenant:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to update tenant" };
      }
    },

    async startImpersonation(params: {
      superAdminId: string;
      sessionToken: string;
      targetUserId: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    }) {
      try {
        const session = await storage.getUserSession(params.sessionToken);
        if (!session) return { ok: false as const, error: "Invalid session", code: "UNAUTHORIZED" as const };
        if (session.impersonatorUserId) {
          return { ok: false as const, error: "Already impersonating", code: "FORBIDDEN" as const };
        }
        const superAdmin = await storage.getUserById(params.superAdminId);
        if (!superAdmin || superAdmin.role !== "super_admin" || superAdmin.tenantId) {
          return { ok: false as const, error: "Forbidden", code: "FORBIDDEN" as const };
        }
        if (session.userId !== superAdmin.id) {
          return { ok: false as const, error: "Session mismatch", code: "FORBIDDEN" as const };
        }
        const target = await storage.getUserById(params.targetUserId);
        if (!target) return { ok: false as const, error: "User not found", code: "NOT_FOUND" as const };
        if (target.role === "super_admin") {
          return { ok: false as const, error: "Cannot impersonate super administrators", code: "FORBIDDEN" as const };
        }
        if (!target.tenantId) {
          return { ok: false as const, error: "Can only impersonate tenant users", code: "FORBIDDEN" as const };
        }
        if (target.status !== "active") {
          return { ok: false as const, error: "User account is not active", code: "FORBIDDEN" as const };
        }
        const tenant = await storage.getTenant(target.tenantId);
        if (!tenant || tenant.status !== "active") {
          return { ok: false as const, error: "Organization is not active", code: "FORBIDDEN" as const };
        }

        await storage.updateUserSessionImpersonation(params.sessionToken, {
          userId: target.id,
          impersonatorUserId: superAdmin.id,
          impersonationStartedAt: new Date(),
        });

        await storage.createImpersonationEvent({
          impersonatorUserId: superAdmin.id,
          targetUserId: target.id,
          targetTenantId: target.tenantId,
          action: "start",
          sessionTokenPrefix: params.sessionToken.slice(0, 8),
          ipAddress: params.ipAddress ?? undefined,
          userAgent: params.userAgent ?? undefined,
          details: { targetEmail: target.email },
        });

        await storage.auditAdminOperation(
          "impersonation_start",
          "session",
          params.sessionToken,
          superAdmin.id,
          target.tenantId,
          null,
          { targetUserId: target.id, targetEmail: target.email },
          {
            targetName: `${target.firstName} ${target.lastName}`,
            superAdminAction: "Support impersonation started",
          }
        );

        const redirectTo =
          target.role === "operations" ? "/operational-duties" : "/dashboard";

        return { ok: true as const, data: { success: true, redirectTo } };
      } catch (err) {
        console.error("SuperAdmin controller startImpersonation:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to start impersonation" };
      }
    },

    async endImpersonation(params: {
      sessionToken: string;
      ipAddress?: string | null;
      userAgent?: string | null;
    }) {
      try {
        const session = await storage.getUserSession(params.sessionToken);
        if (!session?.impersonatorUserId) {
          return { ok: false as const, error: "Not in an impersonation session", code: "FORBIDDEN" as const };
        }
        const superAdmin = await storage.getUserById(session.impersonatorUserId);
        if (!superAdmin || superAdmin.role !== "super_admin" || superAdmin.tenantId) {
          return { ok: false as const, error: "Invalid impersonation session", code: "FORBIDDEN" as const };
        }
        const target = await storage.getUserById(session.userId);

        await storage.updateUserSessionImpersonation(params.sessionToken, {
          userId: superAdmin.id,
          impersonatorUserId: null,
          impersonationStartedAt: null,
        });

        await storage.createImpersonationEvent({
          impersonatorUserId: superAdmin.id,
          targetUserId: target?.id ?? session.userId,
          targetTenantId: target?.tenantId ?? null,
          action: "end",
          reason: "explicit",
          sessionTokenPrefix: params.sessionToken.slice(0, 8),
          ipAddress: params.ipAddress ?? undefined,
          userAgent: params.userAgent ?? undefined,
        });

        if (target?.tenantId) {
          await storage.auditAdminOperation(
            "impersonation_end",
            "session",
            params.sessionToken,
            superAdmin.id,
            target.tenantId,
            null,
            { reason: "explicit" },
            { impersonatedUserId: target.id, superAdminAction: "Support impersonation ended" }
          );
        }

        return { ok: true as const, data: { success: true, redirectTo: "/super-admin/dashboard" } };
      } catch (err) {
        console.error("SuperAdmin controller endImpersonation:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to end impersonation" };
      }
    },

    async listImpersonationEvents() {
      try {
        const data = await storage.getImpersonationEventsEnriched(500);
        return { ok: true as const, data };
      } catch (err) {
        console.error("SuperAdmin controller listImpersonationEvents:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to load impersonation log" };
      }
    },

    async listImpersonationCrudAuditLogs() {
      try {
        const data = await storage.getAuditLogsDuringImpersonation(500);
        return { ok: true as const, data };
      } catch (err) {
        console.error("SuperAdmin controller listImpersonationCrudAuditLogs:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to load impersonation CRUD audit log",
        };
      }
    },

    async getImpersonationSessionAuditLogs(eventId: string) {
      try {
        const event = await storage.getImpersonationEventById(eventId);
        if (!event) return { ok: false as const, error: "Event not found", code: "NOT_FOUND" as const };
        if (event.action !== "start" && event.action !== "end") {
          return {
            ok: false as const,
            error: "Use a session start or end row to load CRUD actions for that session",
            code: "BAD_REQUEST" as const,
          };
        }
        const tenantId =
          event.targetTenantId ?? (await storage.getUserById(event.targetUserId))?.tenantId ?? null;
        if (!tenantId) {
          return { ok: false as const, error: "Cannot resolve tenant for this event", code: "BAD_REQUEST" as const };
        }
        const prefix = event.sessionTokenPrefix;
        const toDate = (d: Date | string | null | undefined) =>
          d instanceof Date ? d : new Date(d != null ? String(d) : 0);

        let windowStart: Date;
        let windowEnd: Date;
        if (event.action === "start") {
          windowStart = toDate(event.createdAt);
          const endEv = await storage.findNextImpersonationEndEvent({
            impersonatorUserId: event.impersonatorUserId,
            targetUserId: event.targetUserId,
            afterTime: windowStart,
            sessionTokenPrefix: prefix,
          });
          windowEnd = endEv ? toDate(endEv.createdAt) : new Date();
        } else {
          windowEnd = toDate(event.createdAt);
          const startEv = await storage.findPreviousImpersonationStartEvent({
            impersonatorUserId: event.impersonatorUserId,
            targetUserId: event.targetUserId,
            beforeTime: windowEnd,
            sessionTokenPrefix: prefix,
          });
          windowStart = startEv ? toDate(startEv.createdAt) : windowEnd;
        }

        const auditLogs = await storage.getAuditLogsInImpersonationWindow({
          tenantId,
          targetUserId: event.targetUserId,
          impersonatorUserId: event.impersonatorUserId,
          windowStart,
          windowEnd,
          limit: 500,
        });

        return {
          ok: true as const,
          data: {
            eventId: event.id,
            window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
            auditLogs,
          },
        };
      } catch (err) {
        console.error("SuperAdmin controller getImpersonationSessionAuditLogs:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to load session audit",
        };
      }
    },

    async getSystemStatus() {
      try {
        const databaseOk = await storage.pingDatabase();
        let countsError: string | undefined;
        let counts = {
          tenants: 0,
          activeTenants: 0,
          users: 0,
          tenantBoundUsers: 0,
          superAdminUsers: 0,
          impersonationEventsLast24h: 0,
        };
        try {
          counts = await storage.getPlatformScaleCounts();
        } catch (e) {
          countsError = e instanceof Error ? e.message : "Failed to load counts";
        }
        return {
          ok: true as const,
          data: {
            database: databaseOk ? ("ok" as const) : ("error" as const),
            nodeVersion: process.version,
            nodeEnv: process.env.NODE_ENV ?? "development",
            processUptimeSeconds: Math.floor(process.uptime()),
            generatedAt: new Date().toISOString(),
            counts,
            countsError,
          },
        };
      } catch (err) {
        console.error("SuperAdmin controller getSystemStatus:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to load system status" };
      }
    },

    async listGlobalAuditLogs() {
      try {
        const data = await storage.getGlobalAuditLogs(500);
        return { ok: true as const, data };
      } catch (err) {
        console.error("SuperAdmin controller listGlobalAuditLogs:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to load global audit log" };
      }
    },

    async getIntegrationsStatus() {
      try {
        return {
          ok: true as const,
          data: {
            email: {
              resend: !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
              gmailSmtp: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD),
            },
            sms: {
              twilio: !!(
                process.env.TWILIO_ACCOUNT_SID &&
                process.env.TWILIO_AUTH_TOKEN &&
                process.env.TWILIO_PHONE_NUMBER
              ),
            },
            blob: {
              vercelBlob: !!process.env.BLOB_READ_WRITE_TOKEN,
            },
          },
        };
      } catch (err) {
        console.error("SuperAdmin controller getIntegrationsStatus:", err);
        return { ok: false as const, error: err instanceof Error ? err.message : "Failed to load integrations" };
      }
    },
  };
}

export type SuperAdminController = ReturnType<typeof createSuperAdminController>;
