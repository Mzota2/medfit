/**
 * React Query hooks for Products
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getItems, getItemById, createItem, updateItem, deleteItem } from '@/lib/items';
import { Item, ItemStatus } from '@/types/item';

/**
 * Query key factory for products
 */
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: {
    businessId?: string;
    status?: ItemStatus;
    categoryId?: string;
    featured?: boolean;
    search?: string;
    limit?: number;
    excludeId?: string;
  }) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

/**
 * Fetch products with filters
 */
export const useProducts = (options?: {
  businessId?: string;
  status?: ItemStatus;
  categoryId?: string;
  featured?: boolean;
  enabled?: boolean;
  search?: string;
  limit?: number;
  excludeId?: string;
}) => {
  return useQuery({
    queryKey: productKeys.list({
      businessId: options?.businessId,
      status: options?.status,
      categoryId: options?.categoryId,
      featured: options?.featured,
      search: options?.search,
      limit: options?.limit,
    }),
    queryFn: async () => {
      const result = await getItems({
        type: 'product',
        businessId: options?.businessId,
        status: options?.status,
        categoryId: options?.categoryId,
        featured: options?.featured,
        search: options?.search,
        limit: options?.limit,
        excludeId: options?.excludeId,
      });
      console.log('[useProducts] Fetched products:', result.items.length, {
        businessId: options?.businessId,
        status: options?.status,
        categoryId: options?.categoryId,
      });
      return result.items;
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single product by ID
 */
export const useProduct = (productId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: productKeys.detail(productId || ''),
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      return await getItemById(productId);
    },
    enabled: options?.enabled !== false && !!productId,
  });
};

/**
 * Create product mutation
 */
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productData: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await createItem({ ...productData, type: 'product' });
    },
    onSuccess: () => {
      // Invalidate products list to refetch
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

/**
 * Update product mutation
 */
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, updates }: { productId: string; updates: Partial<Item> }) => {
      await updateItem(productId, updates);
      return { productId, updates };
    },
    onSuccess: ({ productId }) => {
      // Invalidate both list and detail
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
    },
  });
};

/**
 * Delete product mutation
 */
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      await deleteItem(productId);
      return productId;
    },
    onSuccess: (productId) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: productKeys.detail(productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
};

