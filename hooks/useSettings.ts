/**
 * Hook to access settings efficiently
 * Uses React Query for caching
 */

import { useQuery } from '@tanstack/react-query';
import { getSettings } from '@/lib/settings';
import { Settings } from '@/types/settings';

/**
 * Get settings with React Query caching
 */
export const useSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

/**
 * Get specific cost control setting
 */
export const useCostControlSettings = () => {
  const { data: settings, isLoading, error } = useSettings();

  return {
    realtime: settings?.realtime,
    notifications: settings?.notifications,
    ledger: settings?.ledger,
    documentCreation: settings?.documentCreation,
    performance: settings?.performance,
    isLoading,
    error,
  };
};
