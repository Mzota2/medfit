/**
 * Store type utility functions
 * Efficient helper functions for checking store type
 */

import { StoreType } from '@/types/settings';

/**
 * Check if store type allows products
 */
export const hasProducts = (storeType?: StoreType): boolean => {
  return !storeType || storeType === StoreType.PRODUCTS_ONLY || storeType === StoreType.BOTH;
};

/**
 * Check if store type allows services
 */
export const hasServices = (storeType?: StoreType): boolean => {
  return !storeType || storeType === StoreType.SERVICES_ONLY || storeType === StoreType.BOTH;
};

/**
 * Check if store is products only
 */
export const isProductsOnly = (storeType?: StoreType): boolean => {
  return storeType === StoreType.PRODUCTS_ONLY;
};

/**
 * Check if store is services only
 */
export const isServicesOnly = (storeType?: StoreType): boolean => {
  return storeType === StoreType.SERVICES_ONLY;
};

/**
 * Check if store has both products and services
 */
export const isBoth = (storeType?: StoreType): boolean => {
  return !storeType || storeType === StoreType.BOTH;
};

/**
 * Get display label for store type
 */
export const getStoreTypeLabel = (storeType?: StoreType): string => {
  switch (storeType) {
    case StoreType.PRODUCTS_ONLY:
      return 'Products Only';
    case StoreType.SERVICES_ONLY:
      return 'Services Only';
    case StoreType.BOTH:
      return 'Products & Services';
    default:
      return 'Products & Services'; // Default
  }
};

/**
 * Get store type badge color
 */
export const getStoreTypeBadgeColor = (storeType?: StoreType): string => {
  switch (storeType) {
    case StoreType.PRODUCTS_ONLY:
      return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    case StoreType.SERVICES_ONLY:
      return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
    case StoreType.BOTH:
      return 'bg-green-500/20 text-green-500 border-green-500/30';
    default:
      return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
  }
};

