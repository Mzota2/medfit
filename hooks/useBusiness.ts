/**
 * React Query hooks for Business
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBusinesses, getBusinessById, createBusiness, updateBusiness, deleteBusiness } from '@/lib/businesses';
import { business } from '@/types/business';

/**
 * Query key factory for business
 */
export const businessKeys = {
  all: ['business'] as const,
  lists: () => [...businessKeys.all, 'list'] as const,
  list: (filters?: { limit?: number }) => [...businessKeys.lists(), filters] as const,
  details: () => [...businessKeys.all, 'detail'] as const,
  detail: (id: string) => [...businessKeys.details(), id] as const,
};

/**
 * Fetch all businesses
 */
export const useBusinesses = (options?: {
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: businessKeys.list({ limit: options?.limit }),
    queryFn: async () => {
      return await getBusinesses({ limit: options?.limit });
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single business by ID
 */
export const useBusiness = (businessId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: businessKeys.detail(businessId || ''),
    queryFn: async () => {
      if (!businessId) throw new Error('Business ID is required');
      return await getBusinessById(businessId);
    },
    enabled: options?.enabled !== false && !!businessId,
  });
};

/**
 * Create business mutation
 */
export const useCreateBusiness = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (businessData: Omit<business, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await createBusiness(businessData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessKeys.lists() });
    },
  });
};

/**
 * Update business mutation
 */
export const useUpdateBusiness = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ businessId, updates }: { businessId: string; updates: Partial<business> }) => {
      await updateBusiness(businessId, updates);
      return { businessId, updates };
    },
    onSuccess: ({ businessId }) => {
      queryClient.invalidateQueries({ queryKey: businessKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessKeys.detail(businessId) });
    },
  });
};

/**
 * Delete business mutation
 */
export const useDeleteBusiness = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (businessId: string) => {
      await deleteBusiness(businessId);
      return businessId;
    },
    onSuccess: (businessId) => {
      queryClient.removeQueries({ queryKey: businessKeys.detail(businessId) });
      queryClient.invalidateQueries({ queryKey: businessKeys.lists() });
    },
  });
};

