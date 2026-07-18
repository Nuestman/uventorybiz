import type { Request, RequestHandler, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { sendEmail } from "../../notificationService";
import { getFeedbackPosterShareEmail } from "../../emailTemplates";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";

export interface WellbeingFeedbackRoutesDeps {
  authMiddleware: RequestHandler;
  requireWellbeingRead: RequestHandler;
  requireWellbeingWrite: RequestHandler;
}

const submitFeedbackSchema = z.object({
  tenantId: z.string().optional(),
  locationId: z.string().optional(),
  locationName: z.string().optional(),
  anonymous: z.boolean().optional(),
  wantContact: z.boolean().optional(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  contactPhone: z.string().optional().nullable(),
  careMonthYear: z.string().optional(),
  overallExperienceRating: z.number().int().min(1).max(5).optional().nullable(),
  staffCourtesyRating: z.number().int().min(1).max(5).optional().nullable(),
  waitTimeRating: z.number().int().min(1).max(5).optional().nullable(),
  environmentCleanlinessRating: z.number().int().min(1).max(5).optional().nullable(),
  explanationClarityRating: z.number().int().min(1).max(5).optional().nullable(),
  perceivedSafetyRating: z.number().int().min(1).max(5).optional().nullable(),
  suppliesAndMedicationsRating: z.number().int().min(1).max(5).optional().nullable(),
  wouldRecommend: z.boolean().optional().nullable(),
  wouldReturn: z.boolean().optional().nullable(),
  freeTextFeedback: z.string().optional().nullable(),
}).refine(
  (d) =>
    (d.locationId != null && String(d.locationId).trim().length > 0) ||
    (d.locationName != null && String(d.locationName).trim().length > 0),
  { message: "Location is required", path: ["locationName"] }
);

const updateFeedbackSchema = z.object({
  status: z.enum(["new", "in_review", "acknowledged", "resolved", "closed"]).optional(),
  responseToFeedback: z.string().optional(),
});

const sharePosterSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1),
});

async function listFeedbackLocations(_req: Request, res: Response) {
  try {
    const locations = await storage.listCareLocationsForPublicFeedback();
    res.json(locations);
  } catch {
    sendError(res, 500, "Failed to load locations");
  }
}

async function getFeedbackPublicContext(req: Request, res: Response) {
  try {
    const tenantId = (req.query.tenantId as string) || undefined;
    const context = await storage.getPublicFeedbackContext(tenantId);
    if (!context) {
      return sendError(res, 404, "No tenant or locations found");
    }
    res.json(context);
  } catch {
    sendError(res, 500, "Failed to load context");
  }
}

async function submitFeedback(req: Request, res: Response) {
  const body = req.body as z.infer<typeof submitFeedbackSchema>;
  const scopeTenantId = body.tenantId?.trim() || undefined;
  let location: { id: string; tenantId: string; locationName: string } | undefined;
  let submittedLocationName: string | null = null;

  if (scopeTenantId) {
    if (body.locationId && body.locationId.trim()) {
      location = await storage.getCareLocationByIdAndTenant(body.locationId.trim(), scopeTenantId);
    }
    if (!location && body.locationName && body.locationName.trim()) {
      const name = body.locationName.trim();
      location = await storage.getCareLocationByNameForTenant(name, scopeTenantId);
      if (!location) {
        const fallback = await storage.getFirstActiveCareLocationForTenant(scopeTenantId);
        if (fallback) {
          location = fallback;
          submittedLocationName = name;
        }
      }
    }
  } else {
    if (body.locationId && body.locationId.trim()) {
      location = await storage.getCareLocationByIdForPublic(body.locationId.trim());
    }
    if (!location && body.locationName && body.locationName.trim()) {
      const name = body.locationName.trim();
      location = await storage.getCareLocationByNameForPublic(name);
      if (!location) {
        const fallback = await storage.getFirstActiveCareLocationForPublic();
        if (fallback) {
          location = fallback;
          submittedLocationName = name;
        }
      }
    }
  }

  if (!location) {
    return sendError(
      res,
      400,
      scopeTenantId
        ? "Invalid or unknown location for this site. Please select a location from the list."
        : "No care location is set up yet. Please ask your site administrator to add a care location, or use the feedback link provided by your site."
    );
  }
  const wantContact = body.wantContact === true;
  const anonymous = !wantContact;
  const contactEmail = wantContact && body.contactEmail && String(body.contactEmail).trim() ? String(body.contactEmail).trim() : null;
  const contactPhone = wantContact && body.contactPhone && String(body.contactPhone).trim() ? String(body.contactPhone).trim() : null;
  const responses: Record<string, unknown> = {};
  if (body.suppliesAndMedicationsRating != null) responses.suppliesAndMedicationsRating = body.suppliesAndMedicationsRating;
  if (submittedLocationName) responses.submittedLocationName = submittedLocationName;
  if (body.careMonthYear && body.careMonthYear.trim()) {
    responses.careMonthYear = body.careMonthYear.trim();
  }
  if (wantContact) {
    responses.wantContact = true;
    if (contactEmail) responses.contactEmail = contactEmail;
    if (contactPhone) responses.contactPhone = contactPhone;
  }
  try {
    const feedback = await storage.createEmployeeFeedback(location.tenantId, {
      locationId: location.id,
      anonymous,
      overallExperienceRating: body.overallExperienceRating ?? null,
      staffCourtesyRating: body.staffCourtesyRating ?? null,
      waitTimeRating: body.waitTimeRating ?? null,
      environmentCleanlinessRating: body.environmentCleanlinessRating ?? null,
      explanationClarityRating: body.explanationClarityRating ?? null,
      perceivedSafetyRating: body.perceivedSafetyRating ?? null,
      wouldRecommend: body.wouldRecommend ?? null,
      wouldReturn: body.wouldReturn ?? null,
      freeTextFeedback: body.freeTextFeedback ?? null,
      responses: Object.keys(responses).length ? responses : null,
    });
    res.status(201).json({ id: feedback.id, message: "Thank you for your feedback." });
  } catch {
    sendError(res, 500, "Failed to submit feedback");
  }
}

/**
 * Employee wellbeing feedback router.
 * Public: GET locations, POST submit. Protected: list, get, update.
 * Legacy /our-people/feedback/* public paths kept for existing QR links and bookmarks.
 */
export function createWellbeingFeedbackRouter(deps: WellbeingFeedbackRoutesDeps): Router {
  const { authMiddleware, requireWellbeingRead, requireWellbeingWrite } = deps;
  const router = Router();

  router.get("/wellbeing/feedback/locations", listFeedbackLocations);
  router.get("/our-people/feedback/locations", listFeedbackLocations);

  router.get("/wellbeing/feedback/public-context", getFeedbackPublicContext);
  router.get("/our-people/feedback/public-context", getFeedbackPublicContext);

  router.post("/wellbeing/feedback/submit", validateBody(submitFeedbackSchema), submitFeedback);
  router.post("/our-people/feedback/submit", validateBody(submitFeedbackSchema), submitFeedback);

  router.get("/wellbeing/feedback", authMiddleware, requireWellbeingRead, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");

    const { locationId, status, fromDate, toDate } = req.query as Record<string, string | undefined>;
    const list = await storage.listEmployeeFeedback(tenantId, {
      locationId,
      status,
      fromDate,
      toDate,
    });
    res.json(list);
  });

  router.get("/wellbeing/feedback/:id", authMiddleware, requireWellbeingRead, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");

    const item = await storage.getEmployeeFeedback(req.params.id, tenantId);
    if (!item) return sendError(res, 404, "Feedback not found");
    res.json(item);
  });

  router.patch(
    "/wellbeing/feedback/:id",
    authMiddleware,
    requireWellbeingWrite,
    validateBody(updateFeedbackSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const body = req.body as z.infer<typeof updateFeedbackSchema>;
      const updated = await storage.updateEmployeeFeedback(req.params.id, tenantId, {
        status: body.status,
        responseToFeedback: body.responseToFeedback,
        reviewedBy: userId,
      });
      res.json(updated);
    }
  );

  router.post(
    "/wellbeing/feedback/share-poster",
    authMiddleware,
    requireWellbeingWrite,
    validateBody(sharePosterSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const user = req.user;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const { employeeIds } = req.body as z.infer<typeof sharePosterSchema>;

      const tenant = await storage.getTenant(tenantId);
      const tenantName = tenant?.name || "your organization";

      const baseUrl =
        process.env.REPLIT_DOMAINS?.split(",")[0] ||
        process.env.VERCEL_URL ||
        process.env.RAILWAY_PUBLIC_DOMAIN ||
        process.env.FRONTEND_URL ||
        "http://localhost:17009";

      const normalizedBaseUrl = baseUrl.startsWith("http://") || baseUrl.startsWith("https://")
        ? baseUrl
        : `https://${baseUrl}`;

      const feedbackUrl = `${normalizedBaseUrl}/feedback?tenantId=${encodeURIComponent(tenantId)}`;
      const posterUrl = `${normalizedBaseUrl}/wellbeing/feedback-poster`;

      const employees = await Promise.all(
        employeeIds.map((id: string) => storage.getEmployee(id, tenantId))
      );

      const recipients = employees.filter(
        (e): e is NonNullable<(typeof employees)[number]> => !!e && !!e.email
      );

      if (recipients.length === 0) {
        return sendError(res, 400, "No employees with email addresses were found for this site.");
      }

      let sentCount = 0;
      for (const emp of recipients) {
        try {
          const name =
            [emp.firstName, emp.lastName].filter(Boolean).join(" ") || emp.employeeNumber || "Team member";
          const inviterName =
            user?.firstName || user?.lastName
              ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
              : undefined;

          const html = getFeedbackPosterShareEmail({
            tenantName,
            employeeName: name,
            feedbackUrl,
            posterUrl,
            inviterName,
          });

          const ok = await sendEmail({
            to: emp.email!,
            subject: "Share your workplace care feedback",
            html,
          });

          if (ok) {
            sentCount += 1;
          }
        } catch {
          // Swallow individual errors; report aggregate below
        }
      }

      res.json({
        success: true,
        requested: employeeIds.length,
        emailed: sentCount,
      });
    }
  );

  return router;
}
