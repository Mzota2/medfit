/**
 * React Query hooks for Services
 */

import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { getItems, getItemById, createItem, updateItem, deleteItem } from '@/lib/items';
import { Item, ItemStatus } from '@/types/item';

/**
 * Query key factory for services
 */
export const serviceKeys = {
  all: ['services'] as const,
  lists: () => [...serviceKeys.all, 'list'] as const,
  list: (filters: {
    businessId?: string;
    status?: ItemStatus;
    categoryId?: string;
    featured?: boolean;
  }) => [...serviceKeys.lists(), filters] as const,
  details: () => [...serviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...serviceKeys.details(), id] as const,
};

/**
 * Fetch services with filters
 */
export const useServices = (options?: {
  businessId?: string;
  status?: ItemStatus;
  categoryId?: string;
  featured?: boolean;
  enabled?: boolean;
  refetchInterval?: number | false | ((data: Item[] | undefined) => number | false);
  staleTime?: number;
}) => {
  return useQuery<Item[], Error>({
    queryKey: serviceKeys.list({
      businessId: options?.businessId,
      status: options?.status,
      categoryId: options?.categoryId,
      featured: options?.featured,
    }),
    queryFn: async () => {
      const result = await getItems({
        type: 'service',
        businessId: options?.businessId,
        status: options?.status,
        categoryId: options?.categoryId,
        featured: options?.featured,
      });
      console.log('[useServices] Fetched services:', result.items.length, {
        businessId: options?.businessId,
        status: options?.status,
        categoryId: options?.categoryId,
      });
      return result.items;
    },
    enabled: options?.enabled !== false,
    staleTime: options?.staleTime,
  });
};

/**
 * Fetch single service by ID
 */
export const useService = (serviceId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery<Item, Error>({
    queryKey: serviceKeys.detail(serviceId || ''),
    queryFn: async () => {
      if (!serviceId) throw new Error('Service ID is required');
      return await getItemById(serviceId);
    },
    enabled: options?.enabled !== false && !!serviceId,
  });
};

/**
 * Create service mutation
 */
export const useCreateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await createItem({ ...serviceData, type: 'service' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() as QueryKey });
    },
  });
};

/**
 * Update service mutation
 */
export const useUpdateService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serviceId, updates }: { serviceId: string; updates: Partial<Item> }) => {
      await updateItem(serviceId, updates);
      return { serviceId, updates };
    },
    onSuccess: ({ serviceId }) => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() as QueryKey });
      queryClient.invalidateQueries({ queryKey: serviceKeys.detail(serviceId) as QueryKey });
    },
  });
};

/**
 * Delete service mutation
 */
export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      await deleteItem(serviceId);
      return serviceId;
    },
    onSuccess: (serviceId) => {
      queryClient.removeQueries({ queryKey: serviceKeys.detail(serviceId) as QueryKey });
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() as QueryKey });
    },
  });
};

