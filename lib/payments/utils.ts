/**
 * Payment utility functions for checking settings
 */

import { getSettings } from '@/lib/settings';

/**
 * Check if payment documents should be created
 */
export const shouldCreatePaymentDocument = async (): Promise<boolean> => {
  try {
    const settings = await getSettings();
    return settings?.documentCreation?.createPaymentDocuments ?? true; // Default to true for backward compatibility
  } catch (error) {
    console.error('Error checking payment document creation settings:', error);
    // On error, default to true (create documents) for backward compatibility
    return true;
  }
};

