/**
 * React Query hooks for Delivery Providers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDeliveryProviders,
  getDeliveryProviderById,
  createDeliveryProvider,
  updateDeliveryProvider,
  deleteDeliveryProvider,
} from '@/lib/delivery';
import { DeliveryProvider } from '@/types/delivery';

type DeliveryProviderWithId = DeliveryProvider & { id: string };

/**
 * Query key factory for delivery providers
 */
export const deliveryProviderKeys = {
  all: ['deliveryProviders'] as const,
  lists: () => [...deliveryProviderKeys.all, 'list'] as const,
  list: (filters: {
    businessId?: string;
    isActive?: boolean;
  }) => [...deliveryProviderKeys.lists(), filters] as const,
  details: () => [...deliveryProviderKeys.all, 'detail'] as const,
  detail: (id: string) => [...deliveryProviderKeys.details(), id] as const,
};

/**
 * Fetch delivery providers with filters
 */
export const useDeliveryProviders = (options?: {
  businessId?: string;
  isActive?: boolean;
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: deliveryProviderKeys.list({
      businessId: options?.businessId,
      isActive: options?.isActive,
    }),
    queryFn: async () => {
      return await getDeliveryProviders({
        businessId: options?.businessId,
        isActive: options?.isActive,
        limit: options?.limit,
      });
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single delivery provider by ID
 */
export const useDeliveryProvider = (providerId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: deliveryProviderKeys.detail(providerId || ''),
    queryFn: async () => {
      if (!providerId) throw new Error('Provider ID is required');
      return await getDeliveryProviderById(providerId);
    },
    enabled: options?.enabled !== false && !!providerId,
  });
};

/**
 * Create delivery provider mutation
 */
export const useCreateDeliveryProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerData,
      businessId,
    }: {
      providerData: Omit<DeliveryProvider, 'id' | 'createdAt' | 'updatedAt'>;
      businessId?: string;
    }) => {
      return await createDeliveryProvider(providerData, businessId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryProviderKeys.lists() });
    },
  });
};

/**
 * Update delivery provider mutation
 */
export const useUpdateDeliveryProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerId,
      updates,
    }: {
      providerId: string;
      updates: Partial<DeliveryProvider>;
    }) => {
      await updateDeliveryProvider(providerId, updates);
      return { providerId, updates };
    },
    onSuccess: ({ providerId }) => {
      queryClient.invalidateQueries({ queryKey: deliveryProviderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: deliveryProviderKeys.detail(providerId) });
    },
  });
};

/**
 * Delete delivery provider mutation
 */
export const useDeleteDeliveryProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (providerId: string) => {
      await deleteDeliveryProvider(providerId);
      return providerId;
    },
    onSuccess: (providerId) => {
      queryClient.removeQueries({ queryKey: deliveryProviderKeys.detail(providerId) });
      queryClient.invalidateQueries({ queryKey: deliveryProviderKeys.lists() });
    },
  });
};

