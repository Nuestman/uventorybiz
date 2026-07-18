import { Router } from "express";
import { sendError } from "../../shared/errors";
import {
  LEGAL_DOCUMENT_INDEX,
  buildLegalDocumentPayload,
  getLegalDocumentMeta,
  readLegalDocumentMarkdown,
} from "./legalDocuments";

/**
 * Public legal document API (markdown under docs/, sanitized HTML).
 * Mounted at /api → GET /api/legal/*
 */
export function createLegalRouter(): Router {
  const router = Router();

  router.get("/legal/documents", (_req, res) => {
    try {
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json({
        documents: LEGAL_DOCUMENT_INDEX.map(({ id, title, description }) => ({
          id,
          title,
          description,
        })),
      });
    } catch (err) {
      console.error("GET /api/legal/documents:", err);
      sendError(res, 500, "Legal index unavailable");
    }
  });

  router.get("/legal/document/:id/raw", (req, res) => {
    try {
      const meta = getLegalDocumentMeta(req.params.id);
      if (!meta) {
        sendError(res, 404, "Document not found");
        return;
      }
      const md = readLegalDocumentMarkdown(meta.file);
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${meta.file}"`);
      res.setHeader("Cache-Control", "public, max-age=300");
      res.send(md);
    } catch (err) {
      console.error("GET /api/legal/document/:id/raw:", err);
      sendError(res, 500, "Document unavailable");
    }
  });

  router.get("/legal/document/:id", (req, res) => {
    try {
      const payload = buildLegalDocumentPayload(req.params.id);
      if (!payload) {
        sendError(res, 404, "Document not found");
        return;
      }
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json(payload);
    } catch (err) {
      console.error("GET /api/legal/document/:id:", err);
      sendError(res, 500, "Document unavailable");
    }
  });

  return router;
}
