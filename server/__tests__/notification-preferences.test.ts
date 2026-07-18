import { describe, it, expect, vi } from "vitest";
import { getRecipientsForAlert } from "../notificationService";
import type { IStorage } from "../storage";
import type { User, NotificationType, UserNotificationPreference } from "@shared/schema";

function createMockStorage(overrides: {
  getUsersForNotificationType?: IStorage["getUsersForNotificationType"];
  getActiveTenantUsersByRoles?: IStorage["getActiveTenantUsersByRoles"];
  getNotificationTypes?: IStorage["getNotificationTypes"];
  getNotificationPreferences?: IStorage["getNotificationPreferences"];
}): IStorage {
  return {
    getUsersForNotificationType: overrides.getUsersForNotificationType ?? vi.fn().mockResolvedValue([]),
    getActiveTenantUsersByRoles: overrides.getActiveTenantUsersByRoles ?? vi.fn().mockResolvedValue([]),
    getNotificationTypes: overrides.getNotificationTypes ?? vi.fn().mockResolvedValue([]),
    getNotificationPreferences: overrides.getNotificationPreferences ?? vi.fn().mockResolvedValue([]),
  } as unknown as IStorage;
}

describe("notification preference resolution", () => {
  const tenantId = "tenant-1";
  const typeKey = "incident_created";
  const notificationType: NotificationType = {
    id: "nt-1",
    key: typeKey,
    category: "incident",
    displayName: "Incident Created",
    description: null,
    severitySupported: true,
    systemDefined: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const user1: User = {
    id: "user-1",
    tenantId,
    email: "u1@test.com",
    firstName: "User",
    lastName: "One",
    role: "staff",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedBy: null,
    verificationToken: null,
    verifiedAt: null,
    passwordHash: "",
  };
  const prefEmail: UserNotificationPreference = {
    id: "pref-1",
    tenantId,
    userId: user1.id,
    notificationTypeId: notificationType.id,
    channel: "email",
    enabled: true,
    minSeverity: null,
    adminManaged: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("returns empty when no candidate users exist for incident (no prefs and no safety/admin roles)", async () => {
    const storage = createMockStorage({
      getUsersForNotificationType: vi.fn().mockResolvedValue([]),
      getActiveTenantUsersByRoles: vi.fn().mockResolvedValue([]),
      getNotificationTypes: vi.fn().mockResolvedValue([notificationType]),
    });
    const result = await getRecipientsForAlert(storage, tenantId, typeKey);
    expect(result).toEqual([]);
  });

  it("returns empty when notification type does not exist", async () => {
    const storage = createMockStorage({
      getUsersForNotificationType: vi.fn().mockResolvedValue([user1]),
      getNotificationTypes: vi.fn().mockResolvedValue([]),
    });
    const result = await getRecipientsForAlert(storage, tenantId, typeKey);
    expect(result).toEqual([]);
  });

  it("returns users with channels from their enabled preferences", async () => {
    const storage = createMockStorage({
      getUsersForNotificationType: vi.fn().mockResolvedValue([user1]),
      getNotificationTypes: vi.fn().mockResolvedValue([notificationType]),
      getNotificationPreferences: vi.fn().mockResolvedValue([prefEmail]),
    });
    const result = await getRecipientsForAlert(storage, tenantId, typeKey);
    expect(result).toHaveLength(1);
    expect(result[0].user.id).toBe(user1.id);
    expect(result[0].channels).toContain("email");
  });

  it("uses email + in_app defaults for incident when user has no preference rows for that type", async () => {
    const storage = createMockStorage({
      getUsersForNotificationType: vi.fn().mockResolvedValue([user1]),
      getNotificationTypes: vi.fn().mockResolvedValue([notificationType]),
      getNotificationPreferences: vi.fn().mockResolvedValue([]),
    });
    const result = await getRecipientsForAlert(storage, tenantId, typeKey);
    expect(result).toHaveLength(1);
    expect(result[0].channels.sort()).toEqual(["email", "in_app"].sort());
  });

  it("does not send incident alerts when user opted out (rows exist but all disabled)", async () => {
    const disabled: UserNotificationPreference = {
      ...prefEmail,
      enabled: false,
    };
    const storage = createMockStorage({
      getUsersForNotificationType: vi.fn().mockResolvedValue([user1]),
      getNotificationTypes: vi.fn().mockResolvedValue([notificationType]),
      getNotificationPreferences: vi.fn().mockResolvedValue([disabled]),
    });
    const result = await getRecipientsForAlert(storage, tenantId, typeKey);
    expect(result).toEqual([]);
  });

  it("defaults to email for system-level type when user has no preferences", async () => {
    const systemKey = "equipment_health_report";
    const systemType: NotificationType = {
      ...notificationType,
      id: "nt-sys",
      key: systemKey,
      category: "equipment",
      displayName: "Equipment Health Report",
    };
    const storage = createMockStorage({
      getUsersForNotificationType: vi.fn().mockResolvedValue([user1]),
      getNotificationTypes: vi.fn().mockResolvedValue([systemType]),
      getNotificationPreferences: vi.fn().mockResolvedValue([]),
    });
    const result = await getRecipientsForAlert(storage, tenantId, systemKey);
    expect(result).toHaveLength(1);
    expect(result[0].user.id).toBe(user1.id);
    expect(result[0].channels).toContain("email");
  });
});
