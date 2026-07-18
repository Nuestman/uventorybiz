import type { RequestHandler } from "express";
import type { Multer } from "multer";
import { Router } from "express";
import type { IStorage } from "../../storage";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import {
  createConversationBodySchema,
  messagingExportAckBodySchema,
  markReadBodySchema,
  patchConversationBodySchema,
  sendMessageBodySchema,
} from "@shared/messaging";
import { createMessagingService } from "./messaging.service";
import { subscribePortalStream, subscribeStaffStream } from "./messaging-realtime.service";

export interface StaffMessagingRoutesDeps {
  storage: IStorage;
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
  messagingUpload: Multer;
}

export function createStaffMessagingRouter(deps: StaffMessagingRoutesDeps): Router {
  const { storage, authMiddleware, requireClinicalAccess, messagingUpload } = deps;
  const router = Router();
  const service = createMessagingService(storage);

  router.get("/messaging/unread-count", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
    const count = await service.staffUnreadCount(tenantId, userId);
    res.json({ count });
  });

  router.get("/messaging/stream", authMiddleware, requireClinicalAccess, (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");

    const unsubscribe = subscribeStaffStream(tenantId, userId, res);
    req.on("close", unsubscribe);
  });

  router.get("/messaging/conversations", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");

    const status = req.query.status as "open" | "closed" | "archived" | undefined;
    const patientId = req.query.patientId as string | undefined;
    const assignedToMe = req.query.assignedToMe === "true";
    const inboxKind =
      req.query.inboxKind === "staff_internal"
        ? ("staff_internal" as const)
        : ("patient" as const);

    const result = await service.listStaffInbox(tenantId, userId, {
      status,
      patientId,
      assignedToMe,
      inboxKind,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/messaging/conversations/lookup", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
    const appointmentId = req.query.appointmentId as string | undefined;
    if (!appointmentId) {
      return sendError(res, 400, "appointmentId is required");
    }
    const result = await service.lookupStaffConversation(tenantId, userId, {
      appointmentId,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json({ conversation: result.data });
  });

  router.post(
    "/messaging/conversations",
    authMiddleware,
    requireClinicalAccess,
    validateBody(createConversationBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const { patientId, subject, bodyText, bodyHtml, clientMessageId, appointmentId, staffUserIds } =
        req.body;

      if (staffUserIds?.length && !patientId) {
        const result = await service.createStaffInternalConversation(tenantId, userId, {
          staffUserIds,
          subject,
          bodyText,
          bodyHtml,
          clientMessageId,
        });
        if (!result.ok) {
          if (result.code === "NOT_FOUND" || result.code === "VALIDATION") {
            return sendError(res, 400, result.error);
          }
          if (result.code === "RATE_LIMIT") return sendError(res, 429, result.error);
          return sendError(res, 500, result.error);
        }
        return res.status(201).json(result.data);
      }

      if (!patientId) return sendError(res, 400, "patientId is required");

      const result = await service.createStaffConversation(tenantId, userId, {
        patientId,
        subject,
        bodyText,
        bodyHtml,
        clientMessageId,
        appointmentId,
      });
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "VALIDATION") return sendError(res, 400, result.error);
        if (result.code === "RATE_LIMIT") return sendError(res, 429, result.error);
        return sendError(res, 500, result.error);
      }
      res.status(201).json(result.data);
    },
  );

  router.get(
    "/messaging/conversations/:id/export",
    authMiddleware,
    requireClinicalAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const format = (req.query.format as string) || "csv";
      if (format !== "csv") return sendError(res, 400, "Only csv export is supported");
      const result = await service.exportStaffThreadCsv(tenantId, userId, req.params.id);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.data.filename}"`,
      );
      res.send(result.data.csvContent);
    },
  );

  router.get(
    "/messaging/conversations/:id",
    authMiddleware,
    requireClinicalAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await service.getStaffConversation(tenantId, req.params.id, userId);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
      res.json(result.data);
    },
  );

  router.patch(
    "/messaging/conversations/:id",
    authMiddleware,
    requireClinicalAccess,
    validateBody(patchConversationBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await service.patchConversation(tenantId, userId, req.params.id, req.body);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
      res.json(result.data);
    },
  );

  router.get(
    "/messaging/conversations/:id/messages",
    authMiddleware,
    requireClinicalAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const since = req.query.since as string | undefined;
      const result = await service.listMessages(tenantId, req.params.id, { type: "staff", userId }, since);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
      res.json(result.data);
    },
  );

  router.post(
    "/messaging/conversations/:id/messages",
    authMiddleware,
    requireClinicalAccess,
    validateBody(sendMessageBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await service.sendStaffMessage(tenantId, userId, req.params.id, req.body);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "VALIDATION") return sendError(res, 400, result.error);
        if (result.code === "RATE_LIMIT") return sendError(res, 429, result.error);
        if (result.code === "CLOSED") return sendError(res, 403, result.error);
        return sendError(res, 500, result.error);
      }
      res.status(201).json(result.data);
    },
  );

  router.delete(
    "/messaging/conversations/:id/messages/:messageId",
    authMiddleware,
    requireClinicalAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await service.deleteStaffMessage(
        tenantId,
        userId,
        req.params.id,
        req.params.messageId,
      );
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    },
  );

  router.post(
    "/messaging/conversations/:id/export/ack",
    authMiddleware,
    requireClinicalAccess,
    validateBody(messagingExportAckBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      if (req.body.format !== "print") return sendError(res, 400, "Unsupported format");
      const result = await service.ackStaffThreadPrintExport(tenantId, userId, req.params.id);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
      res.json({ ok: true });
    },
  );

  router.post(
    "/messaging/conversations/:id/read",
    authMiddleware,
    requireClinicalAccess,
    validateBody(markReadBodySchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await service.markStaffRead(tenantId, userId, req.params.id, req.body.messageId);
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
      res.json({ ok: true });
    },
  );

  router.post(
    "/messaging/conversations/:id/messages/:messageId/attachments",
    authMiddleware,
    requireClinicalAccess,
    messagingUpload.single("file"),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const file = req.file as Express.Multer.File | undefined;
      if (!file?.buffer) return sendError(res, 400, "No file uploaded");
      const result = await service.attachMessageFile(
        tenantId,
        req.params.id,
        req.params.messageId,
        { type: "staff", userId },
        {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
      );
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
        if (result.code === "VALIDATION") return sendError(res, 400, result.error);
        return sendError(res, 500, result.error);
      }
      res.status(201).json(result.data);
    },
  );

  return router;
}

export interface PortalMessagingRoutesDeps {
  storage: IStorage;
  requirePortalAuth: RequestHandler;
  requirePortalMessagingFeature: RequestHandler;
  messagingUpload: Multer;
}

export function mountPortalMessagingRoutes(deps: PortalMessagingRoutesDeps): Router {
  const { storage, requirePortalAuth, requirePortalMessagingFeature, messagingUpload } = deps;
  const router = Router();
  const service = createMessagingService(storage);

  router.get(
    "/portal/messaging/unread-count",
    requirePortalAuth,
    requirePortalMessagingFeature,
    async (req: any, res) => {
      const p = req.portal!;
      const count = await service.portalUnreadCount(p.tenantId, p.patientId, p.portalUserId);
      res.json({ count });
    },
  );

  router.get(
    "/portal/messaging/stream",
    requirePortalAuth,
    requirePortalMessagingFeature,
    (req: any, res) => {
      const p = req.portal!;
      const unsubscribe = subscribePortalStream(p.tenantId, p.portalUserId, res);
      req.on("close", unsubscribe);
    },
  );

  router.get(
    "/portal/messaging/clinicians",
    requirePortalAuth,
    requirePortalMessagingFeature,
    async (req: any, res) => {
      const p = req.portal!;
      const clinicians = await service.listPortalClinicians(p.tenantId);
      res.json(clinicians);
    },
  );

  router.get(
    "/portal/messaging/conversations/lookup",
    requirePortalAuth,
    requirePortalMessagingFeature,
    async (req: any, res) => {
      const p = req.portal!;
      const appointmentId = req.query.appointmentId as string | undefined;
      if (!appointmentId) {
        return sendError(res, 400, "appointmentId is required");
      }
      const result = await service.lookupPortalConversation(
        p.tenantId,
        p.patientId,
        p.portalUserId,
        { appointmentId },
      );
      if (!result.ok) return sendError(res, 500, result.error);
      res.json({ conversation: result.data });
    },
  );

  router.get(
    "/portal/messaging/conversations",
    requirePortalAuth,
    requirePortalMessagingFeature,
    async (req: any, res) => {
      const p = req.portal!;
      const result = await service.listPortalInbox(p.tenantId, p.patientId, p.portalUserId);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    },
  );

  router.post(
    "/portal/messaging/conversations",
    requirePortalAuth,
    requirePortalMessagingFeature,
    validateBody(createConversationBodySchema),
    async (req: any, res) => {
      const p = req.portal!;
      const { subject, bodyText, bodyHtml, clientMessageId, messagingConsentAccepted, appointmentId, assignedStaffUserId } =
        req.body;
      const result = await service.createPortalConversation(p.tenantId, p.patientId, p.portalUserId, {
        subject,
        bodyText,
        bodyHtml,
        clientMessageId,
        messagingConsentAccepted,
        appointmentId,
        assignedStaffUserId,
      });
      if (!result.ok) {
        if (result.code === "CONSENT_REQUIRED") return sendError(res, 400, result.error);
        if (result.code === "VALIDATION") return sendError(res, 400, result.error);
        if (result.code === "RATE_LIMIT") return sendError(res, 429, result.error);
        return sendError(res, 500, result.error);
      }
      res.status(201).json(result.data);
    },
  );

  router.get(
    "/portal/messaging/conversations/:id/export",
    requirePortalAuth,
    requirePortalMessagingFeature,
    async (req: any, res) => {
      const p = req.portal!;
      const format = (req.query.format as string) || "csv";
      if (format !== "csv") return sendError(res, 400, "Only csv export is supported");
      const result = await service.exportPortalThreadCsv(
        p.tenantId,
        p.patientId,
        p.portalUserId,
        req.params.id,
      );
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.data.filename}"`,
      );
      res.send(result.data.csvContent);
    },
  );

  router.get(
    "/portal/messaging/conversations/:id",
    requirePortalAuth,
    requirePortalMessagingFeature,
    async (req: any, res) => {
      const p = req.portal!;
      const result = await service.getPortalConversation(
        p.tenantId,
        req.params.id,
        p.patientId,
        p.portalUserId,
      );
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
      res.json(result.data);
    },
  );

  router.get(
    "/portal/messaging/conversations/:id/messages",
    requirePortalAuth,
    requirePortalMessagingFeature,
    async (req: any, res) => {
      const p = req.portal!;
      const since = req.query.since as string | undefined;
      const result = await service.listMessages(
        p.tenantId,
        req.params.id,
        { type: "portal", portalUserId: p.portalUserId, patientId: p.patientId },
        since,
      );
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
      res.json(result.data);
    },
  );

  router.post(
    "/portal/messaging/conversations/:id/messages",
    requirePortalAuth,
    requirePortalMessagingFeature,
    validateBody(sendMessageBodySchema),
    async (req: any, res) => {
      const p = req.portal!;
      const result = await service.sendPortalMessage(
        p.tenantId,
        p.patientId,
        p.portalUserId,
        req.params.id,
        req.body,
      );
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "CONSENT_REQUIRED") return sendError(res, 400, result.error);
        if (result.code === "RATE_LIMIT") return sendError(res, 429, result.error);
        if (result.code === "CLOSED") return sendError(res, 403, result.error);
        return sendError(res, 500, result.error);
      }
      res.status(201).json(result.data);
    },
  );

  router.delete(
    "/portal/messaging/conversations/:id/messages/:messageId",
    requirePortalAuth,
    requirePortalMessagingFeature,
    async (req: any, res) => {
      const p = req.portal!;
      const result = await service.deletePortalMessage(
        p.tenantId,
        p.patientId,
        p.portalUserId,
        req.params.id,
        req.params.messageId,
      );
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    },
  );

  router.post(
    "/portal/messaging/conversations/:id/export/ack",
    requirePortalAuth,
    requirePortalMessagingFeature,
    validateBody(messagingExportAckBodySchema),
    async (req: any, res) => {
      const p = req.portal!;
      if (req.body.format !== "print") return sendError(res, 400, "Unsupported format");
      const result = await service.ackPortalThreadPrintExport(
        p.tenantId,
        p.patientId,
        p.portalUserId,
        req.params.id,
      );
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
      res.json({ ok: true });
    },
  );

  router.post(
    "/portal/messaging/conversations/:id/read",
    requirePortalAuth,
    requirePortalMessagingFeature,
    validateBody(markReadBodySchema),
    async (req: any, res) => {
      const p = req.portal!;
      const result = await service.markPortalRead(
        p.tenantId,
        p.patientId,
        p.portalUserId,
        req.params.id,
        req.body.messageId,
      );
      if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
      res.json({ ok: true });
    },
  );

  router.post(
    "/portal/messaging/conversations/:id/messages/:messageId/attachments",
    requirePortalAuth,
    requirePortalMessagingFeature,
    messagingUpload.single("file"),
    async (req: any, res) => {
      const p = req.portal!;
      const file = req.file as Express.Multer.File | undefined;
      if (!file?.buffer) return sendError(res, 400, "No file uploaded");
      const result = await service.attachMessageFile(
        p.tenantId,
        req.params.id,
        req.params.messageId,
        { type: "portal", portalUserId: p.portalUserId, patientId: p.patientId },
        {
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        },
      );
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "FORBIDDEN") return sendError(res, 403, result.error);
        if (result.code === "VALIDATION") return sendError(res, 400, result.error);
        return sendError(res, 500, result.error);
      }
      res.status(201).json(result.data);
    },
  );

  return router;
}
