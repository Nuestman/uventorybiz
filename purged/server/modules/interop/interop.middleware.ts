import type { RequestHandler } from "express";
import type { InteropPartner } from "@shared/schema";
import { apiKeyPrefix, findPartnerByApiKeyPrefix, verifyInteropApiKey } from "./interop.repository";

declare global {
  namespace Express {
    interface Request {
      interopPartner?: InteropPartner;
    }
  }
}

function extractApiKey(req: { headers: Record<string, unknown> }): string | null {
  const header = req.headers["x-mineaid-interop-key"];
  if (typeof header === "string" && header.trim()) return header.trim();

  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

export function createInteropAuthMiddleware(): RequestHandler {
  return async (req, res, next) => {
    const rawKey = extractApiKey(req);
    if (!rawKey) {
      return res.status(401).json({
        resourceType: "OperationOutcome",
        issue: [{ severity: "error", code: "security", diagnostics: "Missing interop API key" }],
      });
    }

    const prefix = apiKeyPrefix(rawKey);
    const partner = await findPartnerByApiKeyPrefix(prefix);
    if (!partner || !partner.allowInboundRead) {
      return res.status(401).json({
        resourceType: "OperationOutcome",
        issue: [{ severity: "error", code: "security", diagnostics: "Invalid interop API key" }],
      });
    }

    const valid = await verifyInteropApiKey(rawKey, partner.inboundApiKeyHash);
    if (!valid) {
      return res.status(401).json({
        resourceType: "OperationOutcome",
        issue: [{ severity: "error", code: "security", diagnostics: "Invalid interop API key" }],
      });
    }

    req.interopPartner = partner;
    next();
  };
}
