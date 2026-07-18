/**
 * Production-safe logging utility
 * Only logs sensitive data in development mode
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log debug information (only in development)
 */
export function logDebug(message: string, data?: any): void {
  if (isDevelopment) {
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
}

/**
 * Log info (always logged, but sanitized in production)
 */
export function logInfo(message: string, sanitizedData?: Record<string, any>): void {
  if (isDevelopment && sanitizedData) {
    console.log(message, sanitizedData);
  } else {
    console.log(message);
  }
}

/**
 * Log error (always logged, but sanitized in production)
 */
export function logError(message: string, error?: any): void {
  if (isDevelopment) {
    console.error(message, error);
  } else {
    // In production, only log error message, not full error object
    console.error(message, error instanceof Error ? error.message : 'Error details hidden in production');
  }
}

/**
 * Sanitize sensitive data from objects
 */
export function sanitizeForLogging(data: any): any {
  if (!isDevelopment) {
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      // Remove sensitive fields
      const sensitiveFields = ['email', 'password', 'passwordResetToken', 'phoneNumber', 'phoneVerificationCode'];
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      });
      // Truncate IDs to first 8 chars
      if ('id' in sanitized && typeof sanitized.id === 'string') {
        sanitized.id = sanitized.id.substring(0, 8) + '...';
      }
      if ('userId' in sanitized && typeof sanitized.userId === 'string') {
        sanitized.userId = sanitized.userId.substring(0, 8) + '...';
      }
      if ('tenantId' in sanitized && typeof sanitized.tenantId === 'string') {
        sanitized.tenantId = sanitized.tenantId.substring(0, 8) + '...';
      }
      return sanitized;
    }
  }
  return data;
}
