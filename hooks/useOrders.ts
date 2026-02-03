/**
 * React Query hooks for Orders
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrders, getOrderById, updateOrder, cancelOrder } from '@/lib/orders';
import { Order, OrderStatus } from '@/types/order';

/**
 * Query key factory for orders
 */
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: {
    customerId?: string;
    customerEmail?: string;
    status?: OrderStatus;
  }) => [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

/**
 * Fetch orders with filters
 */
export const useOrders = (options?: {
  customerId?: string;
  customerEmail?: string;
  status?: OrderStatus;
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: orderKeys.list({
      customerId: options?.customerId,
      customerEmail: options?.customerEmail,
      status: options?.status,
    }),
    queryFn: async () => {
      const result = await getOrders({
        customerId: options?.customerId,
        customerEmail: options?.customerEmail,
        status: options?.status,
        limit: options?.limit,
      });
      return result.orders;
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single order by ID
 */
export const useOrder = (orderId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: orderKeys.detail(orderId || ''),
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');
      return await getOrderById(orderId);
    },
    enabled: options?.enabled !== false && !!orderId,
  });
};

/**
 * Update order mutation
 */
export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: string; updates: Partial<Order> }) => {
      await updateOrder(orderId, updates);
      return { orderId, updates };
    },
    onSuccess: ({ orderId }) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
  });
};

/**
 * Cancel order mutation
 */
export const useCancelOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      await cancelOrder(orderId, reason);
      return orderId;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) });
    },
  });
};

