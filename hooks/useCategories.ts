/**
 * React Query hooks for Categories
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '@/lib/categories';
import { Category } from '@/types/category';

/**
 * Query key factory for categories
 */
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters: {
    type?: 'product' | 'service' | 'both';
    businessId?: string;
  }) => [...categoryKeys.lists(), filters] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
};

/**
 * Fetch categories with filters
 */
export const useCategories = (options?: {
  type?: 'product' | 'service' | 'both';
  businessId?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: categoryKeys.list({
      type: options?.type,
      businessId: options?.businessId,
    }),
    queryFn: async () => {
      return await getCategories({
        type: options?.type,
        businessId: options?.businessId,
      });
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single category by ID
 */
export const useCategory = (categoryId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: categoryKeys.detail(categoryId || ''),
    queryFn: async () => {
      if (!categoryId) throw new Error('Category ID is required');
      return await getCategoryById(categoryId);
    },
    enabled: options?.enabled !== false && !!categoryId,
  });
};

/**
 * Create category mutation
 */
export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryData,
      businessId,
    }: {
      categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>;
      businessId?: string;
    }) => {
      return await createCategory(categoryData, businessId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
};

/**
 * Update category mutation
 */
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ categoryId, updates }: { categoryId: string; updates: Partial<Category> }) => {
      await updateCategory(categoryId, updates);
      return { categoryId, updates };
    },
    onSuccess: ({ categoryId }) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(categoryId) });
    },
  });
};

/**
 * Delete category mutation
 */
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      await deleteCategory(categoryId);
      return categoryId;
    },
    onSuccess: (categoryId) => {
      queryClient.removeQueries({ queryKey: categoryKeys.detail(categoryId) });
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
  });
};

