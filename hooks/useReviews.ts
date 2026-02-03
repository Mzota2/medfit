/**
 * React Query hooks for Reviews
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReviews, getReviewById, createReview, updateReview, deleteReview } from '@/lib/reviews';
import { Review } from '@/types/reviews';

/**
 * Query key factory for reviews
 */
export const reviewKeys = {
  all: ['reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (filters: {
    itemId?: string;
    userId?: string;
    businessId?: string;
    reviewType?: 'item' | 'business';
  }) => [...reviewKeys.lists(), filters] as const,
  details: () => [...reviewKeys.all, 'detail'] as const,
  detail: (id: string) => [...reviewKeys.details(), id] as const,
};

/**
 * Fetch reviews with filters
 */
export const useReviews = (options?: {
  itemId?: string;
  userId?: string;
  businessId?: string;
  reviewType?: 'item' | 'business';
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: reviewKeys.list({
      itemId: options?.itemId,
      userId: options?.userId,
      businessId: options?.businessId,
      reviewType: options?.reviewType,
    }),
    queryFn: async () => {
      return await getReviews({
        itemId: options?.itemId,
        userId: options?.userId,
        businessId: options?.businessId,
        reviewType: options?.reviewType,
        limit: options?.limit,
      });
    },
    enabled: options?.enabled !== false,
    refetchOnMount: true,
    staleTime: 0, // Always consider data stale so it refetches when invalidated
  });
};

/**
 * Fetch single review by ID
 */
export const useReview = (reviewId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: reviewKeys.detail(reviewId || ''),
    queryFn: async () => {
      if (!reviewId) throw new Error('Review ID is required');
      return await getReviewById(reviewId);
    },
    enabled: options?.enabled !== false && !!reviewId,
  });
};

/**
 * Create review mutation
 */
export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewData,
      businessId,
    }: {
      reviewData: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>;
      businessId?: string;
    }) => {
      return await createReview(reviewData, businessId);
    },
    onSuccess: async (reviewId, variables) => {
      // Invalidate all review list queries to ensure the new review appears
      await queryClient.invalidateQueries({ queryKey: reviewKeys.all, refetchType: 'active' });
      
      // Also specifically invalidate and refetch queries that match this review's filters
      const { reviewData } = variables;
      if (reviewData.reviewType === 'business' && reviewData.businessId) {
        await queryClient.invalidateQueries({
          queryKey: reviewKeys.list({
            reviewType: 'business',
            businessId: reviewData.businessId,
          }),
          refetchType: 'active',
        });
      } else if (reviewData.reviewType === 'item' && reviewData.itemId) {
        await queryClient.invalidateQueries({
          queryKey: reviewKeys.list({
            reviewType: 'item',
            itemId: reviewData.itemId,
            businessId: reviewData.businessId,
          }),
          refetchType: 'active',
        });
      }
    },
  });
};

/**
 * Update review mutation
 */
export const useUpdateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, updates }: { reviewId: string; updates: Partial<Review> }) => {
      await updateReview(reviewId, updates);
      return { reviewId, updates };
    },
    onSuccess: ({ reviewId }) => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(reviewId) });
    },
  });
};

/**
 * Delete review mutation
 */
export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      await deleteReview(reviewId);
      return reviewId;
    },
    onSuccess: (reviewId) => {
      queryClient.removeQueries({ queryKey: reviewKeys.detail(reviewId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
};

