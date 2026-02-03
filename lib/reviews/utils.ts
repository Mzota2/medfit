/**
 * Review utility functions for checking settings
 */

import { getSettings } from '@/lib/settings';

/**
 * Check if reviews feature is enabled
 */
export const isReviewsEnabled = async (): Promise<boolean> => {
  try {
    const settings = await getSettings();
    return settings?.documentCreation?.enableReviews ?? false; // Default to false
  } catch (error) {
    console.error('Error checking reviews settings:', error);
    return false; // Default to disabled on error
  }
};

/**
 * Check if reviews feature is enabled (client-side hook version)
 * Uses React Query for caching
 */
export const useReviewsEnabled = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useSettings } = require('@/hooks/useSettings');
  const { data: settings } = useSettings();
  return settings?.documentCreation?.enableReviews ?? false;
};

