/**
 * React Query hooks for Payments
 */

import { useQuery } from '@tanstack/react-query';
import { getPayments, getPaymentById } from '@/lib/payments';
import { PaymentSession, PaymentSessionStatus } from '@/types/payment';

type PaymentWithId = PaymentSession & { id: string };

/**
 * Query key factory for payments
 */
export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (filters: {
    status?: PaymentSessionStatus;
    orderId?: string;
    bookingId?: string;
    businessId?: string;
  }) => [...paymentKeys.lists(), filters] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
};

/**
 * Fetch payments with filters
 */
export const usePayments = (options?: {
  status?: PaymentSessionStatus;
  orderId?: string;
  bookingId?: string;
  businessId?: string;
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: paymentKeys.list({
      status: options?.status,
      orderId: options?.orderId,
      bookingId: options?.bookingId,
      businessId: options?.businessId,
    }),
    queryFn: async () => {
      return await getPayments({
        status: options?.status,
        orderId: options?.orderId,
        bookingId: options?.bookingId,
        businessId: options?.businessId,
        limit: options?.limit,
      });
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single payment by ID
 */
export const usePayment = (paymentId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: paymentKeys.detail(paymentId || ''),
    queryFn: async () => {
      if (!paymentId) throw new Error('Payment ID is required');
      return await getPaymentById(paymentId);
    },
    enabled: options?.enabled !== false && !!paymentId,
  });
};

