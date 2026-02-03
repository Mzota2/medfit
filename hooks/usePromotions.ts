/**
 * React Query hooks for Promotions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPromotions, getPromotionById, createPromotion, updatePromotion, deletePromotion } from '@/lib/promotions';
import { Promotion, PromotionStatus } from '@/types/promotion';

/**
 * Query key factory for promotions
 */
export const promotionKeys = {
  all: ['promotions'] as const,
  lists: () => [...promotionKeys.all, 'list'] as const,
  list: (filters: {
    status?: PromotionStatus;
    businessId?: string;
  }) => [...promotionKeys.lists(), filters] as const,
  details: () => [...promotionKeys.all, 'detail'] as const,
  detail: (id: string) => [...promotionKeys.details(), id] as const,
};

/**
 * Fetch promotions with filters
 */
export const usePromotions = (options?: {
  status?: PromotionStatus;
  businessId?: string;
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: promotionKeys.list({
      status: options?.status,
      businessId: options?.businessId,
    }),
    queryFn: async () => {
      return await getPromotions({
        status: options?.status,
        businessId: options?.businessId,
        limit: options?.limit,
      });
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single promotion by ID
 */
export const usePromotion = (promotionId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: promotionKeys.detail(promotionId || ''),
    queryFn: async () => {
      if (!promotionId) throw new Error('Promotion ID is required');
      return await getPromotionById(promotionId);
    },
    enabled: options?.enabled !== false && !!promotionId,
  });
};

/**
 * Create promotion mutation
 */
export const useCreatePromotion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      promotionData,
      businessId,
    }: {
      promotionData: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>;
      businessId?: string;
    }) => {
      return await createPromotion(promotionData, businessId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
    },
  });
};

/**
 * Update promotion mutation
 */
export const useUpdatePromotion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ promotionId, updates }: { promotionId: string; updates: Partial<Promotion> }) => {
      await updatePromotion(promotionId, updates);
      return { promotionId, updates };
    },
    onSuccess: ({ promotionId }) => {
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: promotionKeys.detail(promotionId) });
    },
  });
};

/**
 * Delete promotion mutation
 */
export const useDeletePromotion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (promotionId: string) => {
      await deletePromotion(promotionId);
      return promotionId;
    },
    onSuccess: (promotionId) => {
      queryClient.removeQueries({ queryKey: promotionKeys.detail(promotionId) });
      queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
    },
  });
};

