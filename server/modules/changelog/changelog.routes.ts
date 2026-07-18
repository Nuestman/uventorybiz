import { readFileSync } from "fs";
import path from "path";
import { Router } from "express";
import { sendError } from "../../shared/errors";
import { buildChangelogPayload } from "./changelogHtml";

/**
 * Public read of docs/CHANGELOG.md for the marketing Changelog page.
 * Mounted at /api → GET /api/changelog
 */
export function createChangelogRouter(): Router {
  const router = Router();

  router.get("/changelog", (_req, res) => {
    try {
      const filePath = path.join(process.cwd(), "docs", "CHANGELOG.md");
      const md = readFileSync(filePath, "utf-8");
      const payload = buildChangelogPayload(md);

      res.setHeader("Cache-Control", "public, max-age=300");
      res.json(payload);
    } catch (err) {
      console.error("GET /api/changelog:", err);
      sendError(res, 500, "Changelog unavailable");
    }
  });

  return router;
}
