import { put, list, head, del } from '@vercel/blob';
import { env } from './config/env';

/**
 * Vercel Blob Storage Service
 * Handles file uploads to Vercel Blob storage
 */
export class VercelBlobStorage {
  private token: string;

  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN || '';
    if (!this.token && env.NODE_ENV === 'production') {
      console.warn('⚠ BLOB_READ_WRITE_TOKEN not set - file uploads will fail in production');
    }
  }

  /**
   * Check if Vercel Blob is configured
   */
  isConfigured(): boolean {
    return !!this.token;
  }

  /**
   * Upload a file to Vercel Blob
   * @param path - File path/key in blob storage (e.g., "profiles/user-123.jpg")
   * @param fileData - File buffer or data
   * @param options - Additional upload options
   */
  async upload(
    path: string,
    fileData: Buffer | Blob | File,
    options?: {
      contentType?: string;
      /** Ignored: Vercel Blob (current SDK / store tokens) requires public access for `put()`. */
      access?: 'public' | 'private';
      addRandomSuffix?: boolean;
    }
  ): Promise<{ url: string; pathname: string }> {
    if (!this.isConfigured()) {
      throw new Error('Vercel Blob is not configured. Set BLOB_READ_WRITE_TOKEN environment variable.');
    }

    try {
      const blob = await put(path, fileData, {
        // Private access is not supported with standard read-write tokens; passing it caused
        // BlobError: access must be "public" and silent fallback to local disk.
        access: 'public',
        contentType: options?.contentType,
        token: this.token,
        addRandomSuffix: options?.addRandomSuffix ?? true,
      });

      return {
        url: blob.url,
        pathname: blob.pathname,
      };
    } catch (error) {
      console.error('Error uploading to Vercel Blob:', error);
      throw new Error('Failed to upload file to Vercel Blob');
    }
  }

  /**
   * Get file URL from pathname
   * @param pathname - Blob pathname (returned from upload)
   */
  getUrl(pathname: string): string {
    // Vercel Blob URLs follow pattern: https://[hash].public.blob.vercel-storage.com/[pathname]
    // If pathname already includes full URL, return it
    if (pathname.startsWith('http')) {
      return pathname;
    }
    
    // Otherwise construct from pathname (pathname should be unique enough)
    // Note: In production, Vercel Blob returns full URL, so this is mainly for fallback
    return pathname;
  }

  /**
   * Delete a file from Vercel Blob
   * @param pathname - Blob pathname or URL
   */
  async delete(pathname: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Vercel Blob is not configured');
    }

    try {
      await del(pathname, { token: this.token });
    } catch (error) {
      console.error('Error deleting from Vercel Blob:', error);
      throw new Error('Failed to delete file from Vercel Blob');
    }
  }

  /**
   * Check if a file exists
   * @param pathname - Blob pathname or URL
   */
  async exists(pathname: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await head(pathname, { token: this.token });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List files with optional prefix filter
   * @param prefix - Prefix to filter files (e.g., "profiles/")
   */
  async list(prefix?: string): Promise<Array<{ url: string; pathname: string; size: number }>> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const result = await list({ prefix, token: this.token });
      return result.blobs.map(blob => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
      }));
    } catch (error) {
      console.error('Error listing files from Vercel Blob:', error);
      return [];
    }
  }
}

export const vercelBlobStorage = new VercelBlobStorage();


