/**
 * Business utility functions
 */

import { getBusiness } from './index';

/**
 * Get the current business ID
 * Returns the ID of the single business document
 */
export const getBusinessId = async (): Promise<string | undefined> => {
  try {
    const business = await getBusiness();
    return business?.id;
  } catch (error) {
    console.error('Error fetching business ID:', error);
    return undefined;
  }
};

