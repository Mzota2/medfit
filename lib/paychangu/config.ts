
export const paychanguConfig = {
  public_key: process.env.PAYCHANGU_PUBLIC_KEY, // Public key (server-side reference)
  secretKey: process.env.PAYCHANGU_SECRET_KEY, // Secret key for server-side API operations
  baseUrl: process.env.PAYCHANGU_BASE_URL || 'https://api.paychangu.com',
  webhookSecret: process.env.PAYCHANGU_WEBHOOK_SECRET,
};

/**
 * Get the public key for use in payment config
 * Prioritizes NEXT_PUBLIC_PAYCHANGU_PUBLIC_KEY for consistency
 */
export const getPublicKey = (): string => {
  // Prefer NEXT_PUBLIC version (available on both client and server)
  // Fallback to PAYCHANGU_PUBLIC_KEY for backward compatibility
  return process.env.NEXT_PUBLIC_PAYCHANGU_PUBLIC_KEY || process.env.PAYCHANGU_PUBLIC_KEY || '';
};

/**
 * Get the app's base URL for constructing callback and return URLs
 * Uses NEXT_PUBLIC_APP_URL if set, otherwise falls back to localhost for development
 */
export const getAppBaseUrl = (): string => {
  // In production, use environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // In development, default to localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // Fallback - should be set in production
  return 'http://localhost:3000';
};

/**
 * Validate that Paychangu is configured
 * Requires secretKey (for server-side API authentication) and webhookSecret
 * Note: Public key is not required for API calls (only secret key is used)
 */
export const isPaychanguConfigured = (): boolean => {
  return !!(
    paychanguConfig.secretKey &&
    paychanguConfig.webhookSecret
  );
};

/**
 * Get authorization header for Paychangu API requests
 * Uses secret key for server-side API authentication
 */
export const getAuthHeader = (): string => {
  if (!paychanguConfig.secretKey) {
    throw new Error('Paychangu secret key not configured');
  }
  return `Bearer ${paychanguConfig.secretKey}`;
};

