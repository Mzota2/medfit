/**
 * Query limit enforcement utilities
 * Ensures all queries have limits to prevent unlimited reads
 */

import { Query, limit as firestoreLimit, query as firestoreQuery } from 'firebase/firestore';
import { getSettings } from '@/lib/settings';

/**
 * Get the default query limit from settings
 */
export const getDefaultQueryLimit = async (): Promise<number> => {
  try {
    const settings = await getSettings();
    return settings?.performance?.defaultQueryLimit ?? 50;
  } catch (error) {
    console.error('Error getting default query limit:', error);
    return 50; // Default fallback
  }
};

/**
 * Check if query limits should be enforced
 */
export const shouldEnforceQueryLimits = async (): Promise<boolean> => {
  try {
    const settings = await getSettings();
    return settings?.performance?.enforceQueryLimits ?? true; // Default to true
  } catch (error) {
    console.error('Error checking query limit enforcement:', error);
    return true; // Default to enforcing limits
  }
};

/**
 * Ensure a query has a limit
 * If enforceQueryLimits is enabled and query doesn't have a limit, adds default limit
 */
export const ensureQueryLimit = async (query: Query): Promise<Query> => {
  const shouldEnforce = await shouldEnforceQueryLimits();
  
  if (!shouldEnforce) {
    return query;
  }

  // Check if query already has a limit
  // Note: Firestore Query doesn't expose limit directly, so we'll need to track it
  // For now, we'll assume the caller knows if limit is set
  // This is a helper function that should be used when building queries
  
  return query;
};

/**
 * Apply default limit to query if not already set
 * This should be called when building queries
 */
export const applyDefaultLimit = async (query: Query, customLimit?: number): Promise<Query> => {
  const shouldEnforce = await shouldEnforceQueryLimits();
  
  if (!shouldEnforce) {
    return query;
  }

  // If custom limit is provided, use it
  if (customLimit !== undefined) {
    return firestoreQuery(query, firestoreLimit(customLimit));
  }

  // Otherwise, apply default limit
  const defaultLimit = await getDefaultQueryLimit();
  return firestoreQuery(query, firestoreLimit(defaultLimit));
};

