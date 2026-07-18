import { Response } from "express";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { vercelBlobStorage } from "./vercelBlobStorage";

/**
 * Flexible file storage service
 * - Development: Local filesystem (fallback)
 * - Production: Vercel Blob (when BLOB_READ_WRITE_TOKEN is set) or local filesystem
 */

export class FileNotFoundError extends Error {
  constructor() {
    super("File not found");
    this.name = "FileNotFoundError";
    Object.setPrototypeOf(this, FileNotFoundError.prototype);
  }
}

export class FileStorageService {
  private uploadDir: string;
  private publicDir: string;
  private initialized: Promise<void>;

  constructor() {
    // Use environment variables or defaults
    this.uploadDir = process.env.PRIVATE_OBJECT_DIR || './uploads';
    this.publicDir = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split(',')[0] || './public';
    
    // Ensure directories exist asynchronously
    this.initialized = this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(this.publicDir, { recursive: true });
      await fs.mkdir(path.join(this.publicDir, 'profiles'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'uploads'), { recursive: true });
      console.log('✓ File storage directories ready');
    } catch (error) {
      console.error('Error creating storage directories:', error);
      throw error;
    }
  }

  /**
   * Generate upload path for public files (profiles, etc.)
   * Uses tenant-based structure: uventorybiz-blob/tenants/<tenantId>/<category>/
   */
  async getPublicUploadPath(options?: {
    tenantId?: string;
    category?: string;
    userInfo?: { firstName?: string; lastName?: string; id?: string };
    itemName?: string;
    mimetype?: string;
  }): Promise<string> {
    await this.initialized; // Wait for directories to be created

    if (!options?.tenantId) {
      throw new Error('tenantId is required for file uploads');
    }

    const tenantId = options.tenantId;
    const category = options.category || "profiles";

    // Generate sanitized filename (extension from itemName or mimetype)
    let filename = this.generateFilename(options);
    
    // Return tenant-based path: uventorybiz-blob/tenants/<tenantId>/<category>/<filename>
    return `uventorybiz-blob/tenants/${tenantId}/${category}/${filename}`;
  }

  /**
   * Generate upload path for private files
   * Uses tenant-based structure: uventorybiz-blob/tenants/<tenantId>/<category>/
   */
  async getPrivateUploadPath(options?: {
    tenantId?: string;
    category?: string;
    userInfo?: { firstName?: string; lastName?: string; id?: string };
    itemName?: string;
  }): Promise<string> {
    await this.initialized; // Wait for directories to be created
    
    if (!options?.tenantId) {
      throw new Error('tenantId is required for file uploads');
    }
    
    const tenantId = options.tenantId;
    const category = options.category || "uploads";
    
    // Generate sanitized filename
    let filename = this.generateFilename(options);
    
    // Return tenant-based path: uventorybiz-blob/tenants/<tenantId>/<category>/<filename>
    return `uventorybiz-blob/tenants/${tenantId}/${category}/${filename}`;
  }

  /**
   * Save uploaded file to storage (Vercel Blob or local)
   * Supports tenant-based paths: uventorybiz-blob/tenants/<tenantId>/<category>/<filename>
   */
  async saveFile(filePath: string, fileData: Buffer): Promise<string> {
    // Use Vercel Blob if configured (default)
    if (vercelBlobStorage.isConfigured()) {
      try {
        // Path is already in tenant-based format: uventorybiz-blob/tenants/<tenantId>/<category>/<filename>
        // Vercel Blob uploads use public access (required by SDK / read-write token).

        // Determine content type from extension
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes: { [key: string]: string } = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.pdf': 'application/pdf',
          '.txt': 'text/plain',
          '.doc': 'application/msword',
          '.docx':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };
        const contentType = contentTypes[ext] || 'application/octet-stream';

        const result = await vercelBlobStorage.upload(filePath, fileData, {
          contentType,
          addRandomSuffix: false,
        });

        console.log(`✓ File uploaded to Vercel Blob: ${result.pathname}`);
        // Return the full URL for database storage (public URLs work as img src)
        return result.url;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(
          "[FileStorage] Vercel Blob upload failed; falling back to local disk.",
          msg
        );
        // Fall through to local storage
      }
    }
    
    // Fallback to local storage
    await this.initialized; // Wait for directories to be created
    
    try {
      // Extract tenant and category from path: uventorybiz-blob/tenants/<tenantId>/<category>/<filename>
      const pathParts = filePath.split('/');
      const tenantIndex = pathParts.indexOf('tenants');
      if (tenantIndex === -1 || tenantIndex + 1 >= pathParts.length) {
        throw new Error('Invalid tenant-based file path');
      }
      
      const tenantId = pathParts[tenantIndex + 1];
      const category = pathParts[tenantIndex + 2] || 'uploads';
      const filename = pathParts.slice(tenantIndex + 3).join('/');

      // Public categories: served under /public so express.static can serve them without auth
      const isPublic =
        category === 'profiles' ||
        category === 'inventory-images' ||
        category === 'tenant-branding' ||
        category === 'ticket-documents' ||
        category === 'public';
      const baseDir = isPublic ? this.publicDir : this.uploadDir;

      // Create tenant-based local directory structure
      const localPath = path.join(baseDir, 'tenants', tenantId, category, filename);

      // Ensure directory exists
      await fs.mkdir(path.dirname(localPath), { recursive: true });

      // Write file
      await fs.writeFile(localPath, fileData);

      console.log(`✓ File saved locally: ${localPath}`);
      // Return URL: public files under /public/tenants/... (served by express.static), private under /objects/...
      return isPublic
        ? `/public/tenants/${tenantId}/${category}/${filename}`
        : `/objects/tenants/${tenantId}/${category}/${filename}`;
    } catch (error) {
      console.error('Error saving file:', error);
      throw new Error('Failed to save file');
    }
  }

  /**
   * Get file from storage (Vercel Blob or local)
   * Supports both Vercel Blob URLs and tenant-based local paths
   */
  async getFile(filePath: string): Promise<Buffer> {
    // Check if it's a Vercel Blob URL
    if (filePath.startsWith('http') && filePath.includes('blob.vercel-storage.com')) {
      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new FileNotFoundError();
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        console.error('Error fetching from Vercel Blob:', error);
        throw new FileNotFoundError();
      }
    }
    
    // Fallback to local storage
    await this.initialized; // Wait for directories to be created
    
    try {
      // Determine if public or private by URL prefix (not by /tenants/ in path)
      const isPublic = filePath.startsWith('/public-objects') || filePath.startsWith('/public');
      const baseDir = isPublic ? this.publicDir : this.uploadDir;

      // Handle tenant-based paths: /public/tenants/<tenantId>/<category>/<filename>
      // or /objects/tenants/... for private
      let cleanPath = filePath
        .replace(/^\/public-objects\//, '')
        .replace(/^\/public\//, '')
        .replace(/^\/objects\//, '');

      const fullPath = path.join(baseDir, cleanPath);

      if (!existsSync(fullPath)) {
        throw new FileNotFoundError();
      }

      return await fs.readFile(fullPath);
    } catch (error) {
      if (error instanceof FileNotFoundError) throw error;
      console.error('Error reading file:', error);
      throw new FileNotFoundError();
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    await this.initialized; // Wait for directories to be created
    
    try {
      const isPublic = filePath.startsWith('/public-objects') || filePath.startsWith('/public');
      const baseDir = isPublic ? this.publicDir : this.uploadDir;
      
      let cleanPath = filePath
        .replace(/^\/public-objects\//, '')
        .replace(/^\/public\//, '')
        .replace(/^\/objects\//, '');
      
      const fullPath = path.join(baseDir, cleanPath);
      return existsSync(fullPath);
    } catch {
      return false;
    }
  }

  /**
   * Stream file to response
   */
  async streamFile(filePath: string, res: Response): Promise<void> {
    await this.initialized; // Wait for directories to be created
    
    try {
      const fileData = await this.getFile(filePath);
      
      // Determine content type from extension
      const ext = path.extname(filePath).toLowerCase();
      const contentTypes: { [key: string]: string } = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.pdf': 'application/pdf',
        '.txt': 'text/plain',
        '.doc': 'application/msword',
        '.docx':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      const contentType = contentTypes[ext] || 'application/octet-stream';

      res.set({
        'Content-Type': contentType,
        'Content-Length': fileData.length,
        'Cache-Control': 'public, max-age=3600',
      });
      
      res.send(fileData);
    } catch (error) {
      if (error instanceof FileNotFoundError) {
        res.status(404).json({ error: 'File not found' });
      } else {
        console.error('Error streaming file:', error);
        res.status(500).json({ error: 'Error streaming file' });
      }
    }
  }

  /**
   * Generate sanitized filename with timestamp
   * Removes all special characters and ensures safe filenames
   */
  private generateFilename(options?: {
    userInfo?: { firstName?: string; lastName?: string; id?: string };
    itemName?: string;
    mimetype?: string;
  }): string {
    // Extension from original filename, or from mimetype if missing
    const originalItemName = options?.itemName;
    let extension = originalItemName ? path.extname(originalItemName).toLowerCase() : '';
    if (!extension && options?.mimetype) {
      const mimeToExt: Record<string, string> = {
        'image/svg+xml': '.svg',
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/x-icon': '.ico',
      };
      extension = mimeToExt[options.mimetype.toLowerCase()] || '';
    }
    const baseItemName = originalItemName
      ? path.basename(originalItemName, path.extname(originalItemName))
      : undefined;

    // Generate human-readable timestamp: 2025-01-07-15-36-20
    const now = new Date();
    const timestamp = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('-');
    
    // Generate unique identifier
    const uniqueId = randomUUID().substring(0, 8);
    
    // Sanitize base item name if provided
    if (baseItemName) {
      const sanitizedName = baseItemName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove all special chars except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
        .substring(0, 50) || 'file'; // Limit length
      
      return `${sanitizedName}-${timestamp}-${uniqueId}${extension}`;
    }

    // Use user info if available
    if (options?.userInfo && (options.userInfo.firstName || options.userInfo.lastName)) {
      const firstName = options.userInfo.firstName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      const lastName = options.userInfo.lastName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      const userPart = [firstName, lastName].filter(Boolean).join('-');
      return `${userPart}-${timestamp}-${uniqueId}${extension || ''}`;
    }
    
    // Fallback: timestamp + UUID
    return `${timestamp}-${uniqueId}${extension || ''}`;
  }

  /**
   * Normalize uploaded file URL for database storage
   */
  normalizeUploadUrl(rawUrl: string): string {
    // If it's a Vercel Blob URL, keep it as-is (full URL)
    if (rawUrl.startsWith('http') && rawUrl.includes('blob.vercel-storage.com')) {
      return rawUrl;
    }
    
    // If it's already a normalized path, return it
    if (rawUrl.startsWith('/public') || rawUrl.startsWith('/objects')) {
      return rawUrl;
    }

    // If it's a full URL from upload, extract the path
    // This handles both GCS URLs and local URLs
    try {
      const url = new URL(rawUrl);
      return url.pathname;
    } catch {
      // Not a valid URL, return as-is
      return rawUrl;
    }
  }
}

export const fileStorage = new FileStorageService();

