import { apiRequest } from './queryClient';

/**
 * Helper functions for file uploads with human-readable naming
 */

export interface UploadOptions {
  category?: string;
  itemName?: string;
  isPrivate?: boolean;
}

/**
 * Get upload parameters for public files (profile pictures, public assets)
 */
export const getPublicUploadParameters = async (options: UploadOptions = {}) => {
  const response = await apiRequest('POST', '/api/public-objects/upload', {
    category: options.category || 'general',
    itemName: options.itemName
  });
  const data = await response.json();
  return {
    method: 'PUT' as const,
    url: data.uploadURL,
  };
};

/**
 * Get upload parameters for private files (medical records, documents)
 */
export const getPrivateUploadParameters = async (options: UploadOptions = {}) => {
  const response = await apiRequest('POST', '/api/objects/upload', {
    category: options.category || 'uploads',
    itemName: options.itemName
  });
  const data = await response.json();
  return {
    method: 'PUT' as const,
    url: data.uploadURL,
  };
};

/**
 * Upload configurations for different modules
 */
export const uploadConfigs = {
  // Profile pictures
  profilePicture: {
    category: 'profiles',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/*'],
    isPrivate: false
  },
  
  // Medical inventory items (future module)
  inventoryItem: {
    category: 'inventory',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/*'],
    isPrivate: false
  },
  
  // Equipment photos (future module)
  equipment: {
    category: 'equipment',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/*', '.pdf'],
    isPrivate: false
  },
  
  // Medical records/documents
  medicalDocument: {
    category: 'medical-records',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['.pdf', '.doc', '.docx', 'image/*'],
    isPrivate: true
  },
  
  // Incident reports
  incidentDocument: {
    category: 'incidents',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['.pdf', '.doc', '.docx', 'image/*'],
    isPrivate: true
  }
};

/**
 * Generate human-readable item name for uploads
 */
export const generateItemName = (type: string, description?: string, id?: string): string => {
  const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const parts = [type];
  
  if (description) {
    const sanitized = description.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    parts.push(sanitized);
  }
  
  if (id) {
    parts.push(id.slice(-8)); // Last 8 chars of ID
  }
  
  parts.push(timestamp);
  
  return parts.join('-');
};

/**
 * Example usage for future modules:
 * 
 * // For inventory item upload
 * const inventoryUpload = {
 *   category: 'inventory',
 *   itemName: generateItemName('first-aid-kit', 'emergency-station-a', item.id)
 * };
 * // Result filename: first-aid-kit-emergency-station-a-a1b2c3d4-2025-08-10
 * 
 * // For equipment upload
 * const equipmentUpload = {
 *   category: 'equipment',
 *   itemName: generateItemName('excavator', 'cat-320-hydraulic', equipment.id)
 * };
 * // Result filename: excavator-cat-320-hydraulic-e5f6g7h8-2025-08-10
 * 
 * // For medical document upload
 * const medicalUpload = {
 *   category: 'medical-records',
 *   itemName: generateItemName('xray-report', `${patient.firstName}-${patient.lastName}`, patient.id)
 * };
 * // Result filename: xray-report-john-smith-p9a8b7c6-2025-08-10
 */