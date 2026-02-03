/**
 * Hook to get store type from settings
 * Efficiently checks store type without performance issues
 */

import { useQuery } from '@tanstack/react-query';
import { getSettings } from '@/lib/settings';
import { StoreType } from '@/types/settings';

/**
 * Get store type from settings
 * Returns null if not set (defaults to BOTH for backward compatibility)
 */
export const useStoreType = () => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const storeType = settings?.storeType || StoreType.BOTH; // Default to BOTH for backward compatibility

  return {
    storeType,
    isLoading,
    isProductsOnly: storeType === StoreType.PRODUCTS_ONLY,
    isServicesOnly: storeType === StoreType.SERVICES_ONLY,
    isBoth: storeType === StoreType.BOTH,
    hasProducts: storeType === StoreType.PRODUCTS_ONLY || storeType === StoreType.BOTH,
    hasServices: storeType === StoreType.SERVICES_ONLY || storeType === StoreType.BOTH,
  };
};

