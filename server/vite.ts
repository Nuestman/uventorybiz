import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { sendError } from "./shared/errors";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Only import vite in development to avoid bundling issues in production
  // This function is only called in development mode
  const { createServer: createViteServer, createLogger } = await import("vite");

  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "..", "vite.config.ts"),
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const pathname = req.originalUrl.split("?")[0] ?? req.originalUrl;
    if (pathname.startsWith("/api")) {
      return sendError(res, 404, "API route not found");
    }

    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Static files are always in dist/public (built by vite build)
  // Use process.cwd() to get the project root, then find dist/public
  // This works in both development and production (Railway)
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    log(`ERROR: Could not find the build directory: ${distPath}`);
    log(`Current working directory: ${process.cwd()}`);
    log(`Contents of dist/: ${fs.existsSync(path.resolve(process.cwd(), "dist")) ? fs.readdirSync(path.resolve(process.cwd(), "dist")).join(", ") : "does not exist"}`);
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first with 'npm run build'`,
    );
  }

  log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (req, res) => {
    const pathname = req.originalUrl.split("?")[0] ?? req.originalUrl;
    if (pathname.startsWith("/api")) {
      return sendError(res, 404, "API route not found");
    }
    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      log(`ERROR: Could not find index.html at ${indexPath}`);
      return res.status(500).send("Frontend not built. Please build the client first.");
    }
    res.sendFile(indexPath);
  });
}
