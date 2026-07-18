import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { IStorage } from "./storage";
import { getSession } from "./session";
import { AuthService } from "./modules/auth/auth.service";
import { createAuthMiddleware } from "./modules/auth/auth.middleware";
import { sendError } from "./shared/errors";
import { requireAdminAccess, requireSuperAdminAccess, checkAdminStatus } from "./shared/middleware/adminAuth";
import { requireActiveImpersonation as createRequireActiveImpersonation } from "./shared/middleware/impersonationAuth";
import { requireWellbeingRead, requireWellbeingWrite } from "./shared/middleware/wellbeingAuth";
import { requireStaffAccess } from "./shared/middleware/clinicalAuth";
import { requireIncidentReportsAccess } from "./shared/middleware/incidentReportsAuth";
import { requireOperationsReportsAccess } from "./shared/middleware/operationsReportsAuth";
import { requireComplianceReportsAccess } from "./shared/middleware/complianceReportsAuth";
import { requireFleetModuleAccess } from "./shared/middleware/ambulanceAuth";
import multer from 'multer';
import path from 'path';
import { registerAllRoutes } from './routes/index';
import { createSuperAdminController } from "./modules/super-admin/super-admin.controller";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for profile image uploads
  const storage_config = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/profiles');
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp and original extension
      const ext = path.extname(file.originalname);
      const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      cb(null, filename);
    }
  });

  const upload = multer({
    storage: storage_config,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Only allow image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Configure multer for incident document uploads (use memory storage, will be saved via FileStorageService)
  const incidentUpload = multer({
    storage: multer.memoryStorage(), // Use memory storage, files will be saved via FileStorageService with tenant-based paths
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit per file
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Allowed: images, PDF, Word documents'));
      }
    }
  });

  const inventoryImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Only allow images for inventory
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files allowed for inventory items'));
      }
    }
  });

  const messagingUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
      ];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Allowed: PDF and images only'));
      }
    },
  });

  // Configure multer for CSV file uploads (employee bulk import)
  const csvUpload = multer({
    storage: multer.memoryStorage(), // Use memory storage for CSV parsing
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow CSV files and text/csv MIME types
      const allowedTypes = [
        'text/csv',
        'application/csv',
        'text/plain',
        'application/vnd.ms-excel', // Excel CSV
        'application/vnd.ms-excel.sheet.macroEnabled.12' // Some systems send this for CSV
      ];
      const allowedExtensions = ['.csv', '.txt'];
      const fileExt = path.extname(file.originalname).toLowerCase();
      
      if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only CSV files are allowed'));
      }
    }
  });

  // Initialize staff auth service
  // Type cast needed because updateEmployee returns Promise<Employee | null> but interface expects Promise<Employee>
  const storageAsIStorage = storage as IStorage;
  const authService = new AuthService(storageAsIStorage);
  const authMiddleware = createAuthMiddleware(authService);
  
  // Initialize auth middleware with storage dependency
  const requireAdmin = requireAdminAccess(storageAsIStorage);
  const requireSuperAdmin = requireSuperAdminAccess(storageAsIStorage);
  const requireActiveImpersonation = createRequireActiveImpersonation(storageAsIStorage);
  const checkAdmin = checkAdminStatus(storageAsIStorage);
  const requireWellbeingReadMiddleware = requireWellbeingRead(storageAsIStorage);
  const requireWellbeingWriteMiddleware = requireWellbeingWrite(storageAsIStorage);
  const requireStaffAccessMiddleware = requireStaffAccess(storageAsIStorage);
  const requireIncidentReportsAccessMiddleware = requireIncidentReportsAccess(storageAsIStorage);
  const requireOperationsReportsAccessMiddleware = requireOperationsReportsAccess(storageAsIStorage);
  const requireComplianceReportsAccessMiddleware = requireComplianceReportsAccess(storageAsIStorage);
  const requireFleetModuleAccessMiddleware = requireFleetModuleAccess();
  
  // Session middleware (for passport compatibility; staff auth uses its own tokens)
  app.set("trust proxy", 1);
  app.use(getSession());
  
  // Location middleware - automatically injects location from session
  const { injectLocationMiddleware, requireLocationMiddleware } = await import('./shared/middleware/injectLocation');
  // Don't apply globally - will apply per-route after auth middleware

  registerAllRoutes(app, {
    authService,
    authMiddleware,
    checkAdmin,
    requireAdmin,
    requireSuperAdmin,
    requireActiveImpersonation,
    requireWellbeingRead: requireWellbeingReadMiddleware,
    requireWellbeingWrite: requireWellbeingWriteMiddleware,
    requireClinicalAccess: requireStaffAccessMiddleware,
    requireIncidentReportsAccess: requireIncidentReportsAccessMiddleware,
    requireOperationsReportsAccess: requireOperationsReportsAccessMiddleware,
    requireComplianceReportsAccess: requireComplianceReportsAccessMiddleware,
    requireAmbulanceModuleAccess: requireFleetModuleAccessMiddleware,
    upload,
    injectLocationMiddleware,
    csvUpload,
    inventoryImageUpload,
    incidentUpload,
    ticketUpload: incidentUpload,
    portalAvatarUpload: inventoryImageUpload,
    messagingUpload,
  });

  /**
   * Explicit registration: ensures GET /api/super-admin/impersonation-audit-logs is reachable even if a mounted
   * sub-router does not match (e.g. dev hot-reload oddities). Runs after all app.use("/api", ...) from registerAllRoutes;
   * if the super-admin router already handled this path, it never runs.
   */
  const superAdminController = createSuperAdminController(storageAsIStorage, authService);
  app.get(
    "/api/super-admin/impersonation-audit-logs",
    authMiddleware,
    requireSuperAdmin,
    async (_req, res) => {
      const result = await superAdminController.listImpersonationCrudAuditLogs();
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  app.get(
    "/api/super-admin/impersonation-events/:eventId/audit-logs",
    authMiddleware,
    requireSuperAdmin,
    async (req, res) => {
      const eventId = req.params.eventId;
      if (!eventId) return sendError(res, 400, "eventId required");
      const result = await superAdminController.getImpersonationSessionAuditLogs(eventId);
      if (!result.ok) {
        const code = "code" in result ? result.code : undefined;
        const status = code === "NOT_FOUND" ? 404 : code === "BAD_REQUEST" ? 400 : 500;
        return sendError(res, status, result.error);
      }
      res.json(result.data);
    }
  );

  // File Storage Routes - works with local files and cloud storage
  
  // Serve public files (like profile pictures)
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const { FileStorageService } = await import('./fileStorage');
    const fileStorage = new FileStorageService();
    const filePath = `/public-objects/${req.params.filePath}`;
    
    try {
      await fileStorage.streamFile(filePath, res);
    } catch (error) {
      console.error("Error serving public file:", error);
      sendError(res, 404, "File not found");
    }
  });
  
  // Serve private files (requires auth)
  app.get("/objects/:objectPath(*)", authMiddleware, async (req, res) => {
    const { FileStorageService } = await import('./fileStorage');
    const fileStorage = new FileStorageService();
    const filePath = `/objects/${req.params.objectPath}`;
    
    try {
      await fileStorage.streamFile(filePath, res);
    } catch (error) {
      console.error("Error serving private file:", error);
      sendError(res, 404, "File not found");
    }
  });

  // Direct file upload endpoint using multer (for local development)
  const uploadMiddleware = multer({ storage: multer.memoryStorage() });

  app.post("/api/public-objects/upload", authMiddleware, uploadMiddleware.single('file'), async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return sendError(res, 400, "User has no tenant association");
      }
      
      const user = userId ? await storage.getUser(userId) : null;
      
      const { FileStorageService } = await import('./fileStorage');
      const fileStorage = new FileStorageService();
      
      // Generate upload path with tenantId (preserve extension from filename or mimetype)
      const category = req.body.category || "profiles";
      const uploadPath = await fileStorage.getPublicUploadPath({
        tenantId,
        category,
        userInfo: user ? {
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          id: user.id
        } : undefined,
        itemName: req.file?.originalname,
        mimetype: req.file?.mimetype,
      });
      
      // Save the file if provided
      if (req.file && req.file.buffer && req.file.buffer.length > 0) {
        const savedUrl = await fileStorage.saveFile(uploadPath, req.file.buffer);
        if (!savedUrl || typeof savedUrl !== 'string') {
          return sendError(res, 500, "Upload did not return a valid URL");
        }
        res.json({
          success: true,
          uploadURL: savedUrl,
          url: savedUrl,
        });
      } else {
        return sendError(res, 400, "No file or empty file uploaded");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      sendError(res, 500, "Failed to upload file");
    }
  });

  // Upload endpoint for private files
  app.post("/api/objects/upload", authMiddleware, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return sendError(res, 400, "User has no tenant association");
      }
      
      const user = userId ? await storage.getUser(userId) : null;
      
      const { FileStorageService } = await import('./fileStorage');
      const fileStorage = new FileStorageService();
      
      const uploadPath = await fileStorage.getPrivateUploadPath({
        tenantId,
        category: req.body.category || "uploads",
        userInfo: user ? {
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          id: user.id
        } : undefined,
        itemName: req.body.itemName
      });
      
      res.json({ uploadURL: uploadPath });
    } catch (error) {
      console.error("Error getting upload path:", error);
      sendError(res, 500, "Failed to get upload path");
    }
  });

  // Update profile picture
  app.put("/api/profile/picture", authMiddleware, async (req: any, res) => {
    if (!req.body.imageURL) {
      return sendError(res, 400, "imageURL is required");
    }

    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, 401, "User not authenticated");
      }

      const { FileStorageService } = await import('./fileStorage');
      const fileStorage = new FileStorageService();
      const normalizedPath = fileStorage.normalizeUploadUrl(req.body.imageURL);

      // Update user profile picture
      const updatedUser = await storage.updateUserProfilePicture(userId, normalizedPath);

      res.status(200).json({
        success: true,
        profilePicture: normalizedPath,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating profile picture:", error);
      sendError(res, 500, "Internal server error");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
