import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import { z } from "zod";
import type { IStorage } from "../../storage";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import { logError } from "../../logger";
import { isTransientDbError } from "../../shared/dbErrors";
import type { AuthService } from "../auth/auth.service";
import * as repo from "./portal.repository";
import {
  completePortalMagicLogin,
  issuePortalMagicLink,
} from "./portal-auth.service";
import { resolvePortalEmailLookup } from "./portal-email-lookup.service";
import { submitPortalAccessRequest } from "./portal-access-requests.service";
import { createPortalSessionForUser, peekPortalSessionTiming, validateAndTouchPortalSession } from "./portalSession.service";
import { mountPortalMessagingRoutes } from "../messaging/messaging.routes";
import {
  listPortalNotificationsForUser,
  markAllPortalNotificationsReadForUser,
  markPortalNotificationReadForUser,
  portalNotificationsUnreadCount,
} from "./portal-notifications.service";
import {
  getPortalNotificationPreferencesForUser,
  updatePortalNotificationPreferencesForUser,
} from "./portal-notification-preferences.service";
import { PORTAL_NOTIFICATION_CHANNELS, PORTAL_NOTIFICATION_PREFERENCE_KEYS } from "@shared/portalNotificationPreferences";
import { DEFAULT_RETURN_WINDOW_DAYS } from "@shared/portalOrders";
import {
  patientCancelAppointment,
  patientConfirmAppointment,
  patientDeclineAppointment,
  patientRescheduleAppointment,
} from "../appointments/appointment-management.service";
import { requiresPatientConfirmation, requiresStaffConfirmation } from "@shared/appointmentConfirmation";
import { resolveAppointmentLocationDisplay } from "../appointments/appointment-location.service";
import { buildReleaseNotesStatus, getCurrentAppVersion } from "../release-notes/release-notes.service";
import {
  cancelMyOrder,
  confirmOrderReceipt,
  confirmSupplierPurchaseOrder,
  createPortalOrder,
  getSupplierPurchaseOrder,
  listMyOrders,
  listShopLocations,
  listShopProducts,
  listSupplierInvoices,
  listSupplierPurchaseOrders,
  reportOrderNotReceived,
  requestOrderReturn,
  shipSupplierPurchaseOrder,
  submitSupplierInvoice,
} from "./portal-orders.service";
import { isReturnsEnabled } from "./portal-orders.repository";
import {
  addPortalSupportAttachment,
  addPortalSupportComment,
  createPortalSupportTicket,
  getPortalSupportTicketDetail,
  listPortalSupportCategories,
  listPortalSupportTickets,
} from "./portal-support-tickets.service";
import { isFeatureEnabled } from "../feature-flags/feature-flags.service";

const PORTAL_COOKIE = "portalSessionToken";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

async function portalFeaturesForSession(raw: unknown): Promise<repo.PortalFeatures> {
  const base = repo.mergePortalFeatures(raw);
  const ticketsOn = await isFeatureEnabled("tickets");
  const messagingOn = await isFeatureEnabled("messaging");
  return {
    ...base,
    tickets: ticketsOn,
    messaging: base.messaging && messagingOn,
  };
}

const portalSupportCreateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(8000),
  priority: z.enum(["low", "normal", "high"]).optional(),
  categoryId: z.string().uuid(),
  otherCategoryDetail: z.string().max(500).optional(),
});

const portalSupportCommentSchema = z.object({
  body: z.string().min(1).max(8000),
});

const portalLoginSchema = z
  .object({
    slug: z.string().min(1).max(80).optional(),
    tenantId: z.string().uuid().optional(),
    email: z.string().email(),
    password: z.string().min(1),
  })
  .refine((d) => !!(d.slug?.trim() || d.tenantId), {
    message: "Organization context required",
    path: ["slug"],
  });

const portalMagicLinkSchema = z.object({
  email: z.string().email(),
  slug: z.string().min(1).max(80).optional(),
  tenantId: z.string().uuid().optional(),
});

const portalChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const portalEmployeeProfileSchema = z.object({
  phoneNumber: z.string().max(64).optional().nullable(),
  emergencyContactName: z.string().max(200).optional().nullable(),
  emergencyContactPhone: z.string().max(64).optional().nullable(),
  /** ISO date YYYY-MM-DD, empty string, or null to clear */
  dateOfBirth: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()])
    .optional(),
});

const portalAppointmentRequestSchema = z.object({
  preferredDateTime: z.coerce.date().optional().nullable(),
  preferredDate: z.string().optional().nullable(),
  preferredTimeWindow: z.string().max(120).optional().nullable(),
  preferredModality: z.enum(["in_person", "telehealth", "phone"]).optional().default("in_person"),
  preferredLocationId: z.string().min(1).optional().nullable(),
  reason: z.string().max(4000).optional().nullable(),
});

const portalDeclineAppointmentSchema = z.object({
  reason: z.string().max(2000).optional().nullable(),
});

const portalCancelAppointmentSchema = portalDeclineAppointmentSchema;

const portalRescheduleAppointmentSchema = z.object({
  appointmentDate: z.coerce.date(),
  reason: z.string().max(2000).optional().nullable(),
});

export type PortalRequest = {
  portal?: {
    portalUserId: string;
    tenantId: string;
    partyType: string;
    patientId: string | null;
    customerId: string | null;
    supplierId: string | null;
    email: string;
  };
};

function cookieOptions(maxAgeMs: number): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict";
  maxAge: number;
  path: string;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: maxAgeMs,
    path: "/",
  };
}

function getPortalToken(req: any): string | undefined {
  return req.cookies?.[PORTAL_COOKIE] as string | undefined;
}

function clientMeta(req: any) {
  const xf = req.headers["x-forwarded-for"];
  const ip =
    typeof xf === "string"
      ? xf.split(",")[0]?.trim()
      : Array.isArray(xf)
        ? xf[0]
        : req.ip || null;
  return {
    ipAddress: ip,
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
  };
}

export function createPortalSessionMiddleware(): RequestHandler {
  return async (req: any, _res, next) => {
    try {
      const token = getPortalToken(req);
      if (!token) return next();
      const sess = await repo.findPortalSessionByToken(token);
      if (!sess) return next();
      const pu = await repo.findPortalUserById(sess.portalUserId);
      if (!pu || pu.status !== "active") return next();
      const valid = await validateAndTouchPortalSession(sess, pu.tenantId);
      if (!valid.ok) return next();
      req.portal = {
        portalUserId: pu.id,
        tenantId: pu.tenantId,
        partyType: pu.partyType,
        patientId: pu.patientId ?? null,
        customerId: pu.customerId ?? null,
        supplierId: pu.supplierId ?? null,
        email: pu.email,
      };
    } catch (e) {
      console.error("portal session middleware", e);
    }
    next();
  };
}

const requirePortalAuth: RequestHandler = (req: any, res, next) => {
  if (!req.portal?.portalUserId) {
    return sendError(res, 401, "Portal session required");
  }
  next();
};

const requirePortalPatientAuth: RequestHandler = (req: any, res, next) => {
  if (!req.portal?.portalUserId) {
    return sendError(res, 401, "Portal session required");
  }
  if (!req.portal.patientId) {
    return sendError(res, 403, "This feature is not available for your account type");
  }
  next();
};

const requirePortalCustomerAuth: RequestHandler = (req: any, res, next) => {
  if (!req.portal?.portalUserId) {
    return sendError(res, 401, "Portal session required");
  }
  if (!req.portal.customerId) {
    return sendError(res, 403, "Ordering is only available for customer accounts");
  }
  next();
};

const requirePortalSupplierAuth: RequestHandler = (req: any, res, next) => {
  if (!req.portal?.portalUserId) {
    return sendError(res, 401, "Portal session required");
  }
  if (!req.portal.supplierId) {
    return sendError(res, 403, "This feature is only available for supplier accounts");
  }
  next();
};

const requirePortalMessagingFeature: RequestHandler = async (req: any, res, next) => {
  try {
    const p = req.portal;
    if (!p?.tenantId) return sendError(res, 401, "Portal session required");
    if (!(await isFeatureEnabled("messaging"))) {
      return sendError(res, 403, "Secure messaging is currently disabled by the platform administrator", {
        code: "FEATURE_DISABLED",
      });
    }
    const settings = await repo.getTenantPortalSettingsRow(p.tenantId);
    const features = repo.mergePortalFeatures(settings?.featuresJson);
    if (!features.messaging) {
      return sendError(res, 403, "Secure messaging is not enabled for this portal");
    }
    next();
  } catch (err) {
    logError("Portal messaging feature check failed", err);
    return sendError(res, 500, "Unable to verify portal feature access");
  }
};

export interface PortalRoutesDeps {
  storage: IStorage;
  authService: AuthService;
  portalAvatarUpload: Multer;
  messagingUpload: Multer;
}

export function createPortalRouter(deps: PortalRoutesDeps): Router {
  const { storage, authService, portalAvatarUpload, messagingUpload } = deps;
  /** Same memory multer as messaging — images + PDF for support screenshots. */
  const supportUpload = messagingUpload;
  const router = Router();
  const portalSessionMw = createPortalSessionMiddleware();

  router.use(portalSessionMw);

  /** Public: resolve org for branded login */
  router.get("/portal/public/tenant/:slug", async (req, res) => {
    const slug = req.params.slug || "";
    const card = await repo.getPublicTenantPortalCard(slug);
    if (!card) return sendError(res, 404, "Portal is not available for this organization");
    res.json(card);
  });

  const portalAccessRequestSchema = z.object({
    email: z.string().email(),
    slug: z.string().max(80).optional().nullable(),
  });

  const portalEmailLookupSchema = z.object({
    email: z.string().email(),
    slug: z.string().max(80).optional().nullable(),
  });

  router.post("/portal/public/email-lookup", validateBody(portalEmailLookupSchema), async (req, res) => {
    const body = req.body as z.infer<typeof portalEmailLookupSchema>;
    const lookup = await resolvePortalEmailLookup({
      email: body.email,
      slug: body.slug?.trim() || undefined,
    });
    res.json({
      status: lookup.status,
      message: lookup.message,
      tenantName: lookup.tenantName ?? null,
      canMagicLink: lookup.status === "portal_active",
      canRequestAccess:
        lookup.status !== "portal_disabled" &&
        lookup.status !== "ambiguous" &&
        lookup.status !== "org_required",
    });
  });

  router.post("/portal/public/access-request", validateBody(portalAccessRequestSchema), async (req, res) => {
    const body = req.body as z.infer<typeof portalAccessRequestSchema>;
    const result = await submitPortalAccessRequest({
      email: body.email,
      slug: body.slug?.trim() || undefined,
      storage,
    });
    if (!result.ok) {
      const statusCode =
        result.status === "rate_limited" ? 429 : result.status === "portal_disabled" ? 403 : 400;
      return sendError(res, statusCode, result.error);
    }
    res.json({ ok: true, status: result.status, message: result.message });
  });

  router.post("/portal/auth/magic-link", validateBody(portalMagicLinkSchema), async (req, res) => {
    const { email, slug, tenantId } = req.body as z.infer<typeof portalMagicLinkSchema>;
    const meta = clientMeta(req);
    const lookup = await resolvePortalEmailLookup({ email, slug, tenantId });

    if (lookup.status === "ambiguous" || lookup.status === "org_required") {
      return sendError(res, 400, lookup.message);
    }

    if (lookup.status === "portal_disabled") {
      return sendError(res, 403, lookup.message);
    }

    if (lookup.status !== "portal_active" || !lookup.portalUserId) {
      return res.json({
        ok: true,
        status: lookup.status,
        message: lookup.message,
        emailSent: false,
      });
    }

    const pu = await repo.findPortalUserById(lookup.portalUserId);
    if (!pu) {
      return res.json({
        ok: true,
        status: "not_found",
        message: lookup.message,
        emailSent: false,
      });
    }

    const ctx = await repo.loadPortalContext(pu.id);
    const issued = await issuePortalMagicLink({
      portalUserId: pu.id,
      email: pu.email,
      tenantName: lookup.tenantName ?? "Your organization",
      firstName: ctx?.firstName ?? undefined,
      lastName: ctx?.lastName ?? undefined,
      supportEmail: lookup.supportEmail,
    });

    if (!issued.ok) return sendError(res, 429, issued.error);

    await repo.insertPortalAudit({
      tenantId: pu.tenantId,
      portalUserId: pu.id,
      patientId: pu.patientId,
      action: "magic_link_requested",
      details: { emailSent: issued.emailSent },
      ...meta,
    });

    res.json({
      ok: true,
      status: "portal_active",
      message: issued.emailSent
        ? `Sign-in link sent to ${pu.email}. Check your inbox and spam folder.`
        : `We found your account but could not send email right now. Try password sign-in or contact your organization.`,
      emailSent: issued.emailSent,
    });
  });

  router.get("/portal/auth/magic-verify", async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const loginBase = "/portal";
    if (!token.trim()) return res.redirect(`${loginBase}?signin=1&error=invalid`);

    const result = await completePortalMagicLogin({ token, meta: clientMeta(req) });
    if (!result.ok) {
      const reason =
        result.reason === "locked"
          ? "locked"
          : result.reason === "suspended"
            ? "suspended"
            : "invalid";
      return res.redirect(`${loginBase}?signin=1&error=${reason}`);
    }

    res.cookie(PORTAL_COOKIE, result.sessionToken, cookieOptions(result.cookieMaxAgeMs));
    res.redirect("/portal/dashboard");
  });

  router.post("/portal/auth/login", validateBody(portalLoginSchema), async (req, res) => {
    const { slug, tenantId: bodyTenantId, email, password } = req.body as z.infer<typeof portalLoginSchema>;
    const meta = clientMeta(req);
    let tenantId = bodyTenantId;
    if (slug?.trim()) {
      const t = await repo.findTenantByPortalSlug(slug.trim());
      if (!t) return sendError(res, 404, "Unknown organization");
      tenantId = t.id;
    }
    if (!tenantId) return sendError(res, 400, "Tenant required");

    const settings = await repo.getTenantPortalSettingsRow(tenantId);
    if (!settings?.enabled) return sendError(res, 403, "Customer/supplier portal is disabled for this organization");

    const emailLower = email.trim().toLowerCase();
    const pu = await repo.findPortalUserByEmail(tenantId, emailLower);
    if (!pu) {
      await repo.insertPortalAudit({
        tenantId,
        action: "login_failed",
        details: { reason: "unknown_user", email: emailLower },
        ...meta,
      });
      return sendError(res, 401, "Invalid email or password");
    }

    if (pu.status === "locked") return sendError(res, 403, "Account locked. Contact your organization.");
    if (pu.status === "suspended") return sendError(res, 403, "Portal access is suspended. Contact your organization.");
    if (pu.lockedUntil && pu.lockedUntil > new Date()) {
      return sendError(res, 403, "Account temporarily locked. Try again later or contact support.");
    }

    const ok = await authService.verifyPassword(password, pu.passwordHash);
    if (!ok) {
      const attempts = (pu.failedLoginAttempts ?? 0) + 1;
      const lockedUntil =
        attempts >= MAX_LOGIN_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null;
      await repo.updatePortalUserRecord(pu.id, {
        failedLoginAttempts: attempts,
        lockedUntil,
      });
      await repo.insertPortalAudit({
        tenantId,
        portalUserId: pu.id,
        patientId: pu.patientId,
        action: "login_failed",
        details: { attempts },
        ...meta,
      });
      return sendError(res, 401, "Invalid email or password");
    }

    await repo.updatePortalUserRecord(pu.id, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });

    const sessionToken = authService.generateToken();
    const { cookieMaxAgeMs } = await createPortalSessionForUser(pu.id, tenantId, sessionToken);

    res.cookie(PORTAL_COOKIE, sessionToken, cookieOptions(cookieMaxAgeMs));
    await repo.insertPortalAudit({
      tenantId,
      portalUserId: pu.id,
      patientId: pu.patientId,
      action: "login",
      ...meta,
    });

    const ctx = await repo.loadPortalContext(pu.id);
    const features = await portalFeaturesForSession(ctx?.settings?.featuresJson);
    const sessionUser = ctx ? repo.buildPortalSessionUser(ctx) : {
      email: pu.email,
      partyType: pu.partyType,
      customerId: pu.customerId ?? null,
      supplierId: pu.supplierId ?? null,
      patientId: pu.patientId ?? null,
      firstName: pu.email.split("@")[0],
      lastName: "",
      profileImageUrl: null,
      jobTitle: null,
      phoneNumber: null,
    };
    res.json({
      ok: true,
      features,
      user: sessionUser,
    });
  });

  router.post("/portal/auth/logout", async (req: any, res) => {
    const token = getPortalToken(req);
    const p = req.portal;
    if (token) {
      await repo.deletePortalSession(token);
    }
    if (p) {
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        patientId: p.patientId,
        action: "logout",
        ...clientMeta(req),
      });
    }
    res.clearCookie(PORTAL_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    res.json({ ok: true });
  });

  router.get("/portal/auth/session-timing", async (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const token = getPortalToken(req);
    if (!token) return sendError(res, 401, "No active session");
    try {
      const timing = await peekPortalSessionTiming(token);
      if (!timing) return sendError(res, 401, "Invalid or expired session");
      res.json(timing);
    } catch (err) {
      logError("Portal session timing failed", err);
      if (isTransientDbError(err)) {
        return sendError(res, 503, "Session check temporarily unavailable");
      }
      return sendError(res, 500, "Session check failed");
    }
  });

  router.post("/portal/auth/session-keepalive", async (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const token = getPortalToken(req);
    if (!token) return sendError(res, 401, "No active session");
    try {
      const sess = await repo.findPortalSessionByToken(token);
      if (!sess) return sendError(res, 401, "Invalid or expired session");
      const pu = await repo.findPortalUserById(sess.portalUserId);
      if (!pu || pu.status !== "active") return sendError(res, 401, "Invalid or expired session");
      const valid = await validateAndTouchPortalSession(sess, pu.tenantId);
      if (!valid.ok) return sendError(res, 401, "Invalid or expired session");
      const timing = await peekPortalSessionTiming(token);
      if (!timing) return sendError(res, 401, "Invalid or expired session");
      res.json({ ok: true, ...timing });
    } catch (err) {
      logError("Portal session keepalive failed", err);
      if (isTransientDbError(err)) {
        return sendError(res, 503, "Session check temporarily unavailable");
      }
      return sendError(res, 500, "Session check failed");
    }
  });

  router.get("/portal/auth/session", async (req: any, res) => {
    if (!req.portal?.portalUserId) return res.json(null);
    const ctx = await repo.loadPortalContext(req.portal.portalUserId);
    if (!ctx) return res.json(null);
    const features = await portalFeaturesForSession(ctx.settings?.featuresJson);
    res.json({
      features,
      user: repo.buildPortalSessionUser(ctx),
      tenant: {
        id: ctx.tenant.id,
        name: ctx.tenant.name,
        appName: ctx.tenant.appName,
        logoUrl: ctx.tenant.logoUrl,
        primaryColor: ctx.tenant.primaryColor,
        returnsEnabled: ctx.tenant.returnsEnabled !== false,
        returnWindowDays:
          typeof ctx.tenant.returnWindowDays === "number" && ctx.tenant.returnWindowDays >= 1
            ? Math.min(365, Math.floor(ctx.tenant.returnWindowDays))
            : DEFAULT_RETURN_WINDOW_DAYS,
      },
      supportEmail: ctx.settings?.supportEmail ?? ctx.tenant.contactEmail,
      supportPhone: ctx.tenant.contactPhone ?? null,
      tenantContact: {
        email: ctx.tenant.contactEmail,
        phone: ctx.tenant.contactPhone ?? null,
      },
      privacyPolicyUrl: ctx.settings?.privacyPolicyUrl ?? null,
    });
  });

  router.post(
    "/portal/auth/change-password",
    requirePortalAuth,
    validateBody(portalChangePasswordSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const { currentPassword, newPassword } = req.body as z.infer<typeof portalChangePasswordSchema>;
      const pu = await repo.findPortalUserById(p.portalUserId);
      if (!pu) return sendError(res, 401, "Session invalid");
      const valid = await authService.verifyPassword(currentPassword, pu.passwordHash);
      if (!valid) return sendError(res, 400, "Current password is incorrect");
      const passwordHash = await authService.hashPassword(newPassword);
      await repo.updatePortalUserRecord(pu.id, { passwordHash });
      await repo.deleteAllPortalSessionsForUser(pu.id);
      const sessionToken = authService.generateToken();
      const { cookieMaxAgeMs } = await createPortalSessionForUser(pu.id, p.tenantId, sessionToken);
      res.cookie(PORTAL_COOKIE, sessionToken, cookieOptions(cookieMaxAgeMs));
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        patientId: p.patientId,
        action: "password_changed",
        ...clientMeta(req),
      });
      res.json({ ok: true });
    },
  );

  router.get("/portal/me", requirePortalAuth, async (req: any, res) => {
    const p = req.portal!;
    const ctx = await repo.loadPortalContext(p.portalUserId);
    if (!ctx) return sendError(res, 404, "Not found");
    const features = await portalFeaturesForSession(ctx.settings?.featuresJson);
    const base = {
      features,
      partyType: ctx.partyType,
      tenant: {
        id: ctx.tenant.id,
        name: ctx.tenant.name,
        appName: ctx.tenant.appName,
        logoUrl: ctx.tenant.logoUrl,
        primaryColor: ctx.tenant.primaryColor,
      },
      supportEmail: ctx.settings?.supportEmail ?? ctx.tenant.contactEmail,
      privacyPolicyUrl: ctx.settings?.privacyPolicyUrl ?? null,
      profileImageUrl: ctx.employee?.profileImageUrl ?? null,
    };

    if (ctx.patient && ctx.employee) {
      const pat = ctx.patient;
      const emp = ctx.employee;
      return res.json({
        ...base,
        patient: {
          id: pat.id,
          status: pat.status,
          allergies: pat.allergies,
          medicalHistory: pat.medicalHistory,
          medications: pat.medications,
          disability: pat.disability,
          notes: pat.notes,
        },
        employee: {
          id: emp.id,
          employeeNumber: emp.employeeNumber,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          phoneNumber: emp.phoneNumber,
          department: emp.department,
          position: emp.position,
          dateOfBirth: emp.dateOfBirth,
          gender: emp.gender,
          emergencyContactName: emp.emergencyContactName,
          emergencyContactPhone: emp.emergencyContactPhone,
          companyName: ctx.company?.name ?? null,
          profileImageUrl: emp.profileImageUrl ?? null,
        },
      });
    }

    if (ctx.customer) {
      return res.json({
        ...base,
        customer: {
          id: ctx.customer.id,
          firstName: ctx.customer.firstName,
          lastName: ctx.customer.lastName,
          email: ctx.customer.email,
          phone: ctx.customer.phone,
          customerNumber: ctx.customer.customerNumber,
        },
      });
    }

    if (ctx.supplier) {
      return res.json({
        ...base,
        supplier: {
          id: ctx.supplier.id,
          name: ctx.supplier.name,
          contactName: ctx.supplier.contactName,
          email: ctx.supplier.email,
          phone: ctx.supplier.phone,
        },
      });
    }

    return res.json({
      ...base,
      party: {
        firstName: ctx.firstName,
        lastName: ctx.lastName,
        email: ctx.portalUser.email,
      },
    });
  });

  router.put(
    "/portal/employee-profile",
    requirePortalPatientAuth,
    validateBody(portalEmployeeProfileSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const ctx = await repo.loadPortalContext(p.portalUserId);
      if (!ctx?.employee?.id) return sendError(res, 404, "Not found");
      const features = repo.mergePortalFeatures(ctx.settings?.featuresJson);
      if (!features.employeeProfile) return sendError(res, 403, "Feature disabled");
      const body = req.body as z.infer<typeof portalEmployeeProfileSchema>;
      const dobPatch =
        body.dateOfBirth === undefined
          ? {}
          : {
              dateOfBirth:
                body.dateOfBirth === null || body.dateOfBirth === ""
                  ? null
                  : (body.dateOfBirth as string),
            };
      await storage.updateEmployee(
        ctx.employee.id,
        {
          phoneNumber: body.phoneNumber ?? undefined,
          emergencyContactName: body.emergencyContactName ?? undefined,
          emergencyContactPhone: body.emergencyContactPhone ?? undefined,
          ...dobPatch,
        } as Parameters<IStorage["updateEmployee"]>[1],
        p.tenantId,
      );
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        patientId: p.patientId,
        action: "employee_profile_updated",
        ...clientMeta(req),
      });
      res.json({ ok: true });
    },
  );

  router.post(
    "/portal/profile-photo",
    requirePortalPatientAuth,
    portalAvatarUpload.single("file"),
    async (req: any, res) => {
      const p = req.portal!;
      const ctx = await repo.loadPortalContext(p.portalUserId);
      if (!ctx?.employee?.id) return sendError(res, 404, "Not found");
      const features = repo.mergePortalFeatures(ctx.settings?.featuresJson);
      if (!features.employeeProfile) return sendError(res, 403, "Feature disabled");
      const file = req.file as { buffer: Buffer; mimetype: string; originalname: string } | undefined;
      if (!file?.buffer?.length) return sendError(res, 400, "No image file uploaded");
      if (!file.mimetype.startsWith("image/")) return sendError(res, 400, "Only image files are allowed");
      try {
        const { FileStorageService } = await import("../../fileStorage");
        const fileStorage = new FileStorageService();
        const uploadPath = await fileStorage.getPublicUploadPath({
          tenantId: p.tenantId,
          category: "employee-profiles",
          itemName: file.originalname,
          mimetype: file.mimetype,
        });
        const url = await fileStorage.saveFile(uploadPath, file.buffer);
        await storage.updateEmployee(
          ctx.employee.id,
          { profileImageUrl: url } as Parameters<IStorage["updateEmployee"]>[1],
          p.tenantId,
        );
        await repo.insertPortalAudit({
          tenantId: p.tenantId,
          portalUserId: p.portalUserId,
          patientId: p.patientId,
          action: "profile_photo_updated",
          details: { employeeId: ctx.employee.id },
          ...clientMeta(req),
        });
        res.json({ ok: true, profileImageUrl: url });
      } catch (e) {
        console.error("portal profile-photo:", e);
        return sendError(res, 500, e instanceof Error ? e.message : "Upload failed");
      }
    },
  );

  router.delete("/portal/profile-photo", requirePortalPatientAuth, async (req: any, res) => {
    const p = req.portal!;
    const ctx = await repo.loadPortalContext(p.portalUserId);
    if (!ctx) return sendError(res, 404, "Not found");
    const features = repo.mergePortalFeatures(ctx.settings?.featuresJson);
    if (!features.employeeProfile) return sendError(res, 403, "Feature disabled");
    if (!ctx.employee?.id) return sendError(res, 404, "Not found");
    await storage.updateEmployee(
      ctx.employee.id,
      { profileImageUrl: null } as Parameters<IStorage["updateEmployee"]>[1],
      p.tenantId,
    );
    await repo.insertPortalAudit({
      tenantId: p.tenantId,
      portalUserId: p.portalUserId,
      patientId: p.patientId,
      action: "profile_photo_removed",
      details: { employeeId: ctx.employee.id },
      ...clientMeta(req),
    });
    res.json({ ok: true });
  });

  router.get("/portal/appointments", requirePortalAuth, async (req: any, res) => {
    const p = req.portal!;
    const ctx = await repo.loadPortalContext(p.portalUserId);
    if (!ctx) return sendError(res, 404, "Not found");
    const features = repo.mergePortalFeatures(ctx.settings?.featuresJson);
    if (!features.appointments) return sendError(res, 403, "Feature disabled");
    if (!p.patientId) return res.json([]);
    const rows = await repo.listAppointmentsForPatientPortal(p.tenantId, p.patientId);
    const primaryLocation = await storage.getPrimaryCareLocation(p.tenantId);

    const enriched = await Promise.all(
      rows.map(async (r) => {
        const loc = await resolveAppointmentLocationDisplay(
          storage,
          p.tenantId,
          r.appointment,
          primaryLocation,
        );
        return {
          id: r.appointment.id,
          appointmentDate: r.appointment.appointmentDate,
          appointmentType: r.appointment.appointmentType,
          modality: r.appointment.modality,
          status: r.appointment.status,
          durationMinutes: r.appointment.durationMinutes ?? null,
          locationName: loc.locationName ?? r.locationName,
          locationCode: loc.locationCode ?? r.locationCode,
          confirmationRequiredFrom: r.appointment.confirmationRequiredFrom ?? null,
          requiresPatientConfirmation: requiresPatientConfirmation(
            r.appointment.status,
            r.appointment.confirmationRequiredFrom,
          ),
          awaitingStaffConfirmation: requiresStaffConfirmation(
            r.appointment.status,
            r.appointment.confirmationRequiredFrom,
          ),
          canConfirm: requiresPatientConfirmation(
            r.appointment.status,
            r.appointment.confirmationRequiredFrom,
          ),
          canDecline: requiresPatientConfirmation(
            r.appointment.status,
            r.appointment.confirmationRequiredFrom,
          ),
          canCancel: r.appointment.status === "confirmed",
          canReschedule:
            (r.appointment.status === "scheduled" || r.appointment.status === "confirmed") &&
            new Date(r.appointment.appointmentDate).getTime() > Date.now(),
        };
      }),
    );
    res.json(enriched);
  });

  router.post("/portal/appointments/:id/confirm", requirePortalPatientAuth, async (req: any, res) => {
    const p = req.portal!;
    const result = await patientConfirmAppointment(p.tenantId, p.patientId, req.params.id);
    if (!result.ok) {
      const code = result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_STATE" ? 409 : 500;
      return sendError(res, code, result.error);
    }
    await repo.insertPortalAudit({
      tenantId: p.tenantId,
      portalUserId: p.portalUserId,
      patientId: p.patientId,
      action: "appointment_confirmed",
      details: { appointmentId: req.params.id },
      ...clientMeta(req),
    });
    res.json({
      id: result.data.id,
      status: result.data.status,
      modality: result.data.modality,
      appointmentDate: result.data.appointmentDate,
    });
  });

  router.post(
    "/portal/appointments/:id/decline",
    requirePortalPatientAuth,
    validateBody(portalDeclineAppointmentSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const body = req.body as z.infer<typeof portalDeclineAppointmentSchema>;
      const result = await patientDeclineAppointment(p.tenantId, p.patientId, req.params.id, body.reason);
      if (!result.ok) {
        const code = result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_STATE" ? 409 : 500;
        return sendError(res, code, result.error);
      }
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        patientId: p.patientId,
        action: "appointment_declined",
        details: { appointmentId: req.params.id, reason: body.reason ?? null },
        ...clientMeta(req),
      });
      res.json({ id: result.data.id, status: result.data.status });
    },
  );

  router.post(
    "/portal/appointments/:id/cancel",
    requirePortalPatientAuth,
    validateBody(portalCancelAppointmentSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const body = req.body as z.infer<typeof portalCancelAppointmentSchema>;
      const result = await patientCancelAppointment(p.tenantId, p.patientId, req.params.id, body.reason);
      if (!result.ok) {
        const code = result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_STATE" ? 409 : 500;
        return sendError(res, code, result.error);
      }
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        patientId: p.patientId,
        action: "appointment_cancelled",
        details: { appointmentId: req.params.id, reason: body.reason ?? null },
        ...clientMeta(req),
      });
      res.json({ id: result.data.id, status: result.data.status });
    },
  );

  router.post(
    "/portal/appointments/:id/reschedule",
    requirePortalPatientAuth,
    validateBody(portalRescheduleAppointmentSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const body = req.body as z.infer<typeof portalRescheduleAppointmentSchema>;
      const result = await patientRescheduleAppointment(
        p.tenantId,
        p.patientId,
        req.params.id,
        body.appointmentDate,
        body.reason,
      );
      if (!result.ok) {
        const code =
          result.code === "NOT_FOUND"
            ? 404
            : result.code === "INVALID_STATE" || result.code === "CONFLICT" || result.code === "VALIDATION"
              ? 409
              : 500;
        return sendError(res, code, result.error);
      }
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        patientId: p.patientId,
        action: "appointment_rescheduled",
        details: {
          appointmentId: req.params.id,
          appointmentDate: result.data.appointmentDate,
          reason: body.reason ?? null,
        },
        ...clientMeta(req),
      });
      res.json({
        id: result.data.id,
        status: result.data.status,
        appointmentDate: result.data.appointmentDate,
      });
    },
  );

  // Telecare/telehealth was removed in the clinical purge. Keep trivial responses for the
  // portal appointments page, which still queries these endpoints (join UI never renders).
  router.get("/portal/telecare/config", requirePortalPatientAuth, async (_req: any, res) => {
    res.json({ videoProvider: "none", configured: false });
  });

  router.get("/portal/telecare/sessions", requirePortalPatientAuth, async (_req: any, res) => {
    res.json([]);
  });

  router.get("/portal/care-locations", requirePortalPatientAuth, async (req: any, res) => {
    const p = req.portal!;
    const ctx = await repo.loadPortalContext(p.portalUserId);
    if (!ctx) return sendError(res, 404, "Not found");
    const features = repo.mergePortalFeatures(ctx.settings?.featuresJson);
    if (!features.appointments) return sendError(res, 403, "Feature disabled");
    const locations = await storage.getCareLocations(p.tenantId, {
      includeInactive: false,
      locationKind: "fixed_site",
    });
    res.json(
      locations.map((loc) => ({
        id: loc.id,
        locationName: loc.locationName,
        locationCode: loc.locationCode,
        isPrimary: loc.isPrimary,
      })),
    );
  });

  router.get("/portal/appointment-requests", requirePortalPatientAuth, async (req: any, res) => {
    const p = req.portal!;
    const ctx = await repo.loadPortalContext(p.portalUserId);
    if (!ctx) return sendError(res, 404, "Not found");
    const features = repo.mergePortalFeatures(ctx.settings?.featuresJson);
    if (!features.appointments) return sendError(res, 403, "Feature disabled");
    const list = await repo.listAppointmentRequestsForPatient(p.tenantId, p.patientId);
    res.json(list);
  });

  router.post(
    "/portal/appointment-requests",
    requirePortalPatientAuth,
    validateBody(portalAppointmentRequestSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const ctx = await repo.loadPortalContext(p.portalUserId);
      if (!ctx) return sendError(res, 404, "Not found");
      const features = repo.mergePortalFeatures(ctx.settings?.featuresJson);
      if (!features.appointments) return sendError(res, 403, "Feature disabled");
      const body = req.body as z.infer<typeof portalAppointmentRequestSchema>;
      const preferredDateTime = body.preferredDateTime
        ? body.preferredDateTime instanceof Date
          ? body.preferredDateTime
          : new Date(body.preferredDateTime)
        : null;
      const preferredDate =
        preferredDateTime && !Number.isNaN(preferredDateTime.getTime())
          ? preferredDateTime.toISOString().slice(0, 10)
          : body.preferredDate ?? null;
      const preferredTimeWindow =
        preferredDateTime && !Number.isNaN(preferredDateTime.getTime())
          ? preferredDateTime.toISOString()
          : body.preferredTimeWindow ?? null;
      const row = await repo.createAppointmentRequest({
        tenantId: p.tenantId,
        patientId: p.patientId,
        preferredDate,
        preferredTimeWindow,
        preferredModality: body.preferredModality ?? "in_person",
        preferredLocationId:
          body.preferredModality === "in_person" ? body.preferredLocationId ?? null : null,
        reason: body.reason ?? null,
      });
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        patientId: p.patientId,
        action: "appointment_request_created",
        details: { requestId: row.id, preferredModality: body.preferredModality ?? "in_person" },
        ...clientMeta(req),
      });
      res.status(201).json(row);
    },
  );

  router.patch(
    "/portal/appointment-requests/:id",
    requirePortalPatientAuth,
    validateBody(portalAppointmentRequestSchema.partial()),
    async (req: any, res) => {
      const p = req.portal!;
      const ctx = await repo.loadPortalContext(p.portalUserId);
      if (!ctx) return sendError(res, 404, "Not found");
      const features = repo.mergePortalFeatures(ctx.settings?.featuresJson);
      if (!features.appointments) return sendError(res, 403, "Feature disabled");

      const body = req.body as z.infer<typeof portalAppointmentRequestSchema>;
      const preferredDateTime = body.preferredDateTime
        ? body.preferredDateTime instanceof Date
          ? body.preferredDateTime
          : new Date(body.preferredDateTime)
        : undefined;

      const patch: Parameters<typeof repo.updateAppointmentRequestForPatient>[3] = {};
      if (body.preferredModality !== undefined) patch.preferredModality = body.preferredModality;
      if (body.reason !== undefined) patch.reason = body.reason ?? null;
      if (body.preferredLocationId !== undefined) {
        patch.preferredLocationId =
          (body.preferredModality ?? patch.preferredModality) === "telehealth"
            ? null
            : body.preferredLocationId ?? null;
      }
      if (preferredDateTime !== undefined) {
        if (preferredDateTime && !Number.isNaN(preferredDateTime.getTime())) {
          patch.preferredDate = preferredDateTime.toISOString().slice(0, 10);
          patch.preferredTimeWindow = preferredDateTime.toISOString();
        } else {
          patch.preferredDate = body.preferredDate ?? null;
          patch.preferredTimeWindow = body.preferredTimeWindow ?? null;
        }
      } else if (body.preferredDate !== undefined || body.preferredTimeWindow !== undefined) {
        patch.preferredDate = body.preferredDate ?? null;
        patch.preferredTimeWindow = body.preferredTimeWindow ?? null;
      }

      const result = await repo.updateAppointmentRequestForPatient(
        p.tenantId,
        p.patientId,
        req.params.id,
        patch,
      );
      if ("error" in result) {
        const code = result.error === "NOT_FOUND" ? 404 : 409;
        return sendError(
          res,
          code,
          result.error === "NOT_FOUND" ? "Request not found" : "Only pending requests can be edited",
        );
      }

      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        patientId: p.patientId,
        action: "appointment_request_updated",
        details: { requestId: req.params.id },
        ...clientMeta(req),
      });
      res.json(result.row);
    },
  );

  router.get("/portal/notifications/unread-count", requirePortalAuth, async (req: any, res) => {
    const p = req.portal!;
    const count = await portalNotificationsUnreadCount(p.tenantId, p.portalUserId);
    res.json({ count });
  });

  const portalNotificationPreferencesSchema = z.object({
    preferences: z.array(
      z.object({
        key: z.enum(PORTAL_NOTIFICATION_PREFERENCE_KEYS),
        channel: z.enum(PORTAL_NOTIFICATION_CHANNELS),
        enabled: z.boolean(),
      }),
    ),
  });

  const portalReleaseNotesAckSchema = z.object({
    version: z.string().min(1).max(32),
  });

  router.get("/portal/release-notes/status", requirePortalAuth, async (req: any, res) => {
    const p = req.portal!;
    const pu = await repo.findPortalUserById(p.portalUserId);
    if (!pu) {
      sendError(res, 404, "Portal user not found");
      return;
    }
    res.json(buildReleaseNotesStatus("portal", pu.lastAcknowledgedReleaseVersion));
  });

  router.post(
    "/portal/release-notes/acknowledge",
    requirePortalAuth,
    validateBody(portalReleaseNotesAckSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const currentVersion = getCurrentAppVersion();
      const body = req.body as z.infer<typeof portalReleaseNotesAckSchema>;
      if (body.version !== currentVersion) {
        sendError(res, 400, "Version mismatch");
        return;
      }
      await repo.updatePortalUserRecord(p.portalUserId, {
        lastAcknowledgedReleaseVersion: currentVersion,
      });
      res.json(buildReleaseNotesStatus("portal", currentVersion));
    },
  );

  router.get("/portal/notification-preferences", requirePortalAuth, async (req: any, res) => {
    const p = req.portal!;
    const preferences = await getPortalNotificationPreferencesForUser(p.tenantId, p.portalUserId);
    res.json({ preferences });
  });

  router.put(
    "/portal/notification-preferences",
    requirePortalAuth,
    validateBody(portalNotificationPreferencesSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const body = req.body as z.infer<typeof portalNotificationPreferencesSchema>;
      const preferences = await updatePortalNotificationPreferencesForUser(
        p.tenantId,
        p.portalUserId,
        body.preferences,
      );
      res.json({ preferences });
    },
  );

  router.get("/portal/notifications", requirePortalAuth, async (req: any, res) => {
    const p = req.portal!;
    const rows = await listPortalNotificationsForUser(p.tenantId, p.portalUserId);
    res.json(rows);
  });

  router.post("/portal/notifications/:id/read", requirePortalAuth, async (req: any, res) => {
    const p = req.portal!;
    const row = await markPortalNotificationReadForUser(
      p.tenantId,
      p.portalUserId,
      req.params.id,
    );
    if (!row) return sendError(res, 404, "Notification not found");
    res.json(row);
  });

  router.post("/portal/notifications/read-all", requirePortalAuth, async (req: any, res) => {
    const p = req.portal!;
    await markAllPortalNotificationsReadForUser(p.tenantId, p.portalUserId);
    res.json({ ok: true });
  });

  // --- Customer ordering (shop, orders) ---

  const portalCreateOrderSchema = z.object({
    fulfillmentType: z.enum(["pickup", "delivery"]),
    locationId: z.string().min(1).optional().nullable(),
    deliveryAddress: z.string().max(2000).optional().nullable(),
    customerNotes: z.string().max(4000).optional().nullable(),
    items: z
      .array(
        z.object({
          itemId: z.string().min(1),
          quantity: z.number().int().min(1).max(10000),
        }),
      )
      .min(1)
      .max(100),
  });

  router.get("/portal/shop/locations", requirePortalCustomerAuth, async (req: any, res) => {
    const p = req.portal!;
    res.json(await listShopLocations(p.tenantId));
  });

  router.get("/portal/shop/products", requirePortalCustomerAuth, async (req: any, res) => {
    const p = req.portal!;
    const locationId = typeof req.query.locationId === "string" ? req.query.locationId : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const result = await listShopProducts(p.tenantId, locationId, search);
    if (!result.ok) return sendError(res, 404, result.error);
    res.json(result.data);
  });

  router.post(
    "/portal/orders",
    requirePortalCustomerAuth,
    validateBody(portalCreateOrderSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const body = req.body as z.infer<typeof portalCreateOrderSchema>;
      const result = await createPortalOrder({
        storage,
        tenantId: p.tenantId,
        customerId: p.customerId!,
        portalUserId: p.portalUserId,
        input: {
          fulfillmentType: body.fulfillmentType,
          locationId: body.locationId ?? null,
          deliveryAddress: body.deliveryAddress ?? null,
          customerNotes: body.customerNotes ?? null,
          items: body.items,
        },
      });
      if (!result.ok) return sendError(res, 400, result.error);
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        action: "order_placed",
        details: { orderId: result.data.orderId, orderNumber: result.data.orderNumber },
        ...clientMeta(req),
      });
      res.status(201).json(result.data);
    },
  );

  router.get("/portal/orders", requirePortalCustomerAuth, async (req: any, res) => {
    const p = req.portal!;
    res.json(await listMyOrders(p.tenantId, p.customerId!));
  });

  router.post("/portal/orders/:id/cancel", requirePortalCustomerAuth, async (req: any, res) => {
    const p = req.portal!;
    const result = await cancelMyOrder({
      tenantId: p.tenantId,
      customerId: p.customerId!,
      orderId: req.params.id,
    });
    if (!result.ok) {
      const code = result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_STATE" ? 409 : 400;
      return sendError(res, code, result.error);
    }
    await repo.insertPortalAudit({
      tenantId: p.tenantId,
      portalUserId: p.portalUserId,
      action: "order_cancelled",
      details: { orderId: req.params.id },
      ...clientMeta(req),
    });
    res.json(result.data);
  });

  router.post("/portal/orders/:id/confirm-receipt", requirePortalCustomerAuth, async (req: any, res) => {
    const p = req.portal!;
    const result = await confirmOrderReceipt({
      tenantId: p.tenantId,
      customerId: p.customerId!,
      orderId: req.params.id,
    });
    if (!result.ok) {
      const code = result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_STATE" ? 409 : 400;
      return sendError(res, code, result.error);
    }
    await repo.insertPortalAudit({
      tenantId: p.tenantId,
      portalUserId: p.portalUserId,
      action: "order_receipt_confirmed",
      details: { orderId: req.params.id },
      ...clientMeta(req),
    });
    res.json(result.data);
  });

  const portalNotReceivedSchema = z.object({
    reason: z.string().max(2000).optional().nullable(),
  });

  router.post(
    "/portal/orders/:id/not-received",
    requirePortalCustomerAuth,
    validateBody(portalNotReceivedSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const body = req.body as z.infer<typeof portalNotReceivedSchema>;
      const result = await reportOrderNotReceived({
        storage,
        tenantId: p.tenantId,
        customerId: p.customerId!,
        orderId: req.params.id,
        reason: body.reason ?? null,
      });
      if (!result.ok) {
        const code = result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_STATE" ? 409 : 400;
        return sendError(res, code, result.error);
      }
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        action: "order_not_received_reported",
        details: { orderId: req.params.id, reason: body.reason ?? null },
        ...clientMeta(req),
      });
      res.json(result.data);
    },
  );

  const portalReturnRequestSchema = z.object({
    reason: z.string().max(2000).optional().nullable(),
  });

  router.post(
    "/portal/orders/:id/request-return",
    requirePortalCustomerAuth,
    validateBody(portalReturnRequestSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const body = req.body as z.infer<typeof portalReturnRequestSchema>;
      const result = await requestOrderReturn({
        storage,
        tenantId: p.tenantId,
        customerId: p.customerId!,
        orderId: req.params.id,
        reason: body.reason ?? null,
      });
      if (!result.ok) {
        const code =
          result.code === "NOT_FOUND"
            ? 404
            : result.code === "INVALID_STATE"
              ? 409
              : result.code === "RETURNS_DISABLED"
                ? 403
                : 400;
        return sendError(res, code, result.error);
      }
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        action: "order_return_requested",
        details: { orderId: req.params.id, reason: body.reason ?? null },
        ...clientMeta(req),
      });
      res.json(result.data);
    },
  );

  // --- Supplier purchase orders + invoices ---

  const portalSupplierInvoiceSchema = z.object({
    purchaseOrderId: z.string().min(1),
    /** Optional; server always generates the canonical number. */
    invoiceNumber: z.string().max(64).optional().nullable(),
    amount: z.union([z.string().min(1), z.number()]).transform((v) => String(v)),
    /** ISO date YYYY-MM-DD */
    invoiceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    notes: z.string().max(4000).optional().nullable(),
  });

  router.get("/portal/supplier/purchase-orders", requirePortalSupplierAuth, async (req: any, res) => {
    const p = req.portal!;
    res.json(await listSupplierPurchaseOrders(p.tenantId, p.supplierId!));
  });

  router.get("/portal/supplier/purchase-orders/:id", requirePortalSupplierAuth, async (req: any, res) => {
    const p = req.portal!;
    const result = await getSupplierPurchaseOrder(p.tenantId, p.supplierId!, req.params.id);
    if (!result) return sendError(res, 404, "Purchase order not found");
    res.json(result);
  });

  router.post(
    "/portal/supplier/purchase-orders/:id/confirm",
    requirePortalSupplierAuth,
    async (req: any, res) => {
      const p = req.portal!;
      const result = await confirmSupplierPurchaseOrder({
        tenantId: p.tenantId,
        supplierId: p.supplierId!,
        portalUserId: p.portalUserId,
        poId: req.params.id,
      });
      if (!result.ok) {
        const code = result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_STATE" ? 409 : 400;
        return sendError(res, code, result.error);
      }
      res.json(result.data);
    },
  );

  router.post(
    "/portal/supplier/purchase-orders/:id/ship",
    requirePortalSupplierAuth,
    async (req: any, res) => {
      const p = req.portal!;
      const result = await shipSupplierPurchaseOrder({
        tenantId: p.tenantId,
        supplierId: p.supplierId!,
        portalUserId: p.portalUserId,
        poId: req.params.id,
      });
      if (!result.ok) {
        const code = result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_STATE" ? 409 : 400;
        return sendError(res, code, result.error);
      }
      res.json(result.data);
    },
  );

  router.get("/portal/supplier/invoices", requirePortalSupplierAuth, async (req: any, res) => {
    const p = req.portal!;
    res.json(await listSupplierInvoices(p.tenantId, p.supplierId!));
  });

  router.post(
    "/portal/supplier/invoices",
    requirePortalSupplierAuth,
    validateBody(portalSupplierInvoiceSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const body = req.body as z.infer<typeof portalSupplierInvoiceSchema>;
      const result = await submitSupplierInvoice({
        storage,
        tenantId: p.tenantId,
        supplierId: p.supplierId!,
        portalUserId: p.portalUserId,
        input: {
          purchaseOrderId: body.purchaseOrderId,
          invoiceNumber: body.invoiceNumber,
          amount: body.amount,
          invoiceDate: body.invoiceDate ?? null,
          notes: body.notes ?? null,
        },
      });
      if (!result.ok) {
        const code = result.code === "CONFLICT" || result.code === "INVALID_STATE" ? 409 : 400;
        return sendError(res, code, result.error);
      }
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        action: "supplier_invoice_submitted",
        details: { invoiceId: result.data.invoiceId },
        ...clientMeta(req),
      });
      res.status(201).json(result.data);
    },
  );

  router.use(
    mountPortalMessagingRoutes({
      storage,
      requirePortalAuth,
      requirePortalMessagingFeature,
      messagingUpload,
    }),
  );

  const requirePortalTicketsFeature: RequestHandler = async (_req, res, next) => {
    if (!(await isFeatureEnabled("tickets"))) {
      return sendError(res, 403, "Support tickets are disabled");
    }
    next();
  };

  router.get(
    "/portal/support-tickets",
    requirePortalAuth,
    requirePortalTicketsFeature,
    async (req: any, res) => {
      const p = req.portal!;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const result = await listPortalSupportTickets(storage, p.tenantId, p.portalUserId, { status });
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.get(
    "/portal/support-tickets/categories",
    requirePortalAuth,
    requirePortalTicketsFeature,
    async (req: any, res) => {
      const p = req.portal!;
      const result = await listPortalSupportCategories(storage, p.tenantId);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.post(
    "/portal/support-tickets",
    requirePortalAuth,
    requirePortalTicketsFeature,
    validateBody(portalSupportCreateSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const body = req.body as z.infer<typeof portalSupportCreateSchema>;
      const result = await createPortalSupportTicket(storage, {
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        portalEmail: p.email ?? "portal user",
        title: body.title,
        description: body.description,
        priority: body.priority,
        categoryId: body.categoryId,
        otherCategoryDetail: body.otherCategoryDetail,
      });
      if (!result.ok) {
        const status = result.code === "INVALID" ? 400 : 500;
        return sendError(res, status, result.error);
      }
      await repo.insertPortalAudit({
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        action: "support_ticket_created",
        details: { ticketId: result.data.id, ticketNumber: result.data.ticketNumber },
        ...clientMeta(req),
      });
      res.status(201).json(result.data);
    }
  );

  router.get(
    "/portal/support-tickets/:id",
    requirePortalAuth,
    requirePortalTicketsFeature,
    async (req: any, res) => {
      const p = req.portal!;
      const result = await getPortalSupportTicketDetail(
        storage,
        p.tenantId,
        p.portalUserId,
        req.params.id
      );
      if (!result.ok) {
        const status = result.code === "NOT_FOUND" ? 404 : 500;
        return sendError(res, status, result.error);
      }
      res.json(result.data);
    }
  );

  router.post(
    "/portal/support-tickets/:id/comments",
    requirePortalAuth,
    requirePortalTicketsFeature,
    validateBody(portalSupportCommentSchema),
    async (req: any, res) => {
      const p = req.portal!;
      const body = req.body as z.infer<typeof portalSupportCommentSchema>;
      const result = await addPortalSupportComment(storage, {
        tenantId: p.tenantId,
        portalUserId: p.portalUserId,
        ticketId: req.params.id,
        body: body.body,
      });
      if (!result.ok) {
        const status =
          result.code === "NOT_FOUND"
            ? 404
            : result.code === "FORBIDDEN"
              ? 403
              : result.code === "INVALID"
                ? 400
                : 500;
        return sendError(res, status, result.error);
      }
      res.status(201).json(result.data);
    }
  );

  router.post(
    "/portal/support-tickets/:id/attachments",
    requirePortalAuth,
    requirePortalTicketsFeature,
    supportUpload.single("file"),
    async (req: any, res) => {
      try {
        const p = req.portal!;
        const file = req.file as Express.Multer.File | undefined;
        if (!file?.buffer) return sendError(res, 400, "No file uploaded");
        const { FileStorageService } = await import("../../fileStorage");
        const fileStorage = new FileStorageService();
        const uploadPath = await fileStorage.getPublicUploadPath({
          tenantId: p.tenantId,
          category: "ticket-documents",
          itemName: file.originalname,
          mimetype: file.mimetype,
        });
        const url = await fileStorage.saveFile(uploadPath, file.buffer);
        const result = await addPortalSupportAttachment(storage, {
          tenantId: p.tenantId,
          portalUserId: p.portalUserId,
          ticketId: req.params.id,
          fileUrl: url,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        });
        if (!result.ok) {
          const status =
            result.code === "FORBIDDEN" ? 403 : result.code === "INVALID" ? 400 : 500;
          return sendError(res, status, result.error);
        }
        res.status(201).json(result.data);
      } catch (e) {
        console.error("portal support attachment upload:", e);
        sendError(res, 500, e instanceof Error ? e.message : "Upload failed");
      }
    }
  );

  return router;
}
