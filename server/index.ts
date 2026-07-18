import "./config/env"; // Load environment variables first
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import os from "os";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { sendError } from "./shared/errors";
import { vercelBlobStorage } from "./vercelBlobStorage";
import { initializeCronJobs } from "./cronJobs";
import { storage } from "./storage";
import { logError } from "./logger";

function getLocalNetworkAddresses(): string[] {
  const addresses: string[] = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces ?? []) {
      const family = String(net.family);
      const isIPv4 = family === "IPv4" || family === "4";
      if (isIPv4 && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

const app = express();
/** Rich HTML without base64 blobs; override via JSON_BODY_LIMIT if needed. */
const jsonBodyLimit = process.env.JSON_BODY_LIMIT ?? "1mb";
app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.urlencoded({ extended: false, limit: jsonBodyLimit }));
app.use(cookieParser());

// Serve static files from public directory
// Use absolute path to avoid issues in different environments
const publicPath = path.resolve(process.cwd(), 'public');
if (fs.existsSync(publicPath)) {
  app.use('/public', express.static(publicPath));
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);
    
    // Initialize cron jobs for scheduled tasks
    initializeCronJobs(storage);

    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const status = (err as { status?: number; statusCode?: number }).status
        ?? (err as { status?: number; statusCode?: number }).statusCode
        ?? 500;
      const message = (err instanceof Error ? err.message : "Internal Server Error");

      log(`Error: ${message} (Status: ${status})`);
      sendError(res, status, message);
      if (process.env.NODE_ENV !== 'production') {
        console.error(err);
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Railway automatically sets PORT environment variable
    // Default to 5000 for local development
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen(port, "0.0.0.0", () => {
      log(`✓ Server running on port ${port}`);
      log(`✓ Local:   http://localhost:${port}`);
      for (const address of getLocalNetworkAddresses()) {
        log(`✓ Network: http://${address}:${port} (other devices on same Wi‑Fi/LAN)`);
      }
      log(`✓ External tunnel: npm run tunnel (then set FRONTEND_URL to the https URL)`);
      log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      const storageMode = vercelBlobStorage.isConfigured()
        ? 'Vercel Blob (BLOB_READ_WRITE_TOKEN detected)'
        : 'Local filesystem (no BLOB_READ_WRITE_TOKEN)';
      log(`✓ File storage: ${storageMode}`);
      if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        log(`✓ Railway URL: https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
      }
    });

    // Handle server errors
    server.on('error', (err: Error) => {
      log(`Server error: ${err.message}`);
      console.error(err);
    });
  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exit(1);
  }
})();

// Handle unhandled promise rejections — log only; do not exit (transient DB errors on session polling)
process.on('unhandledRejection', (reason: unknown) => {
  log(`Unhandled Rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
  console.error('Unhandled Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  log(`Uncaught Exception: ${error.message}`);
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
