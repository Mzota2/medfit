/**
 * React Query hooks for Bookings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBookings, getBookingById, updateBooking, cancelBooking } from '@/lib/bookings';
import { Booking, BookingStatus } from '@/types/booking';

/**
 * Query key factory for bookings
 */
export const bookingKeys = {
  all: ['bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters: {
    customerId?: string;
    customerEmail?: string;
    serviceId?: string;
    status?: BookingStatus;
  }) => [...bookingKeys.lists(), filters] as const,
  details: () => [...bookingKeys.all, 'detail'] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};

/**
 * Fetch bookings with filters
 */
export const useBookings = (options?: {
  customerId?: string;
  customerEmail?: string;
  serviceId?: string;
  status?: BookingStatus;
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: bookingKeys.list({
      customerId: options?.customerId,
      customerEmail: options?.customerEmail,
      serviceId: options?.serviceId,
      status: options?.status,
    }),
    queryFn: async () => {
      const result = await getBookings({
        customerId: options?.customerId,
        customerEmail: options?.customerEmail,
        serviceId: options?.serviceId,
        status: options?.status,
        limit: options?.limit,
      });
      return result.bookings;
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single booking by ID
 */
export const useBooking = (bookingId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: bookingKeys.detail(bookingId || ''),
    queryFn: async () => {
      if (!bookingId) throw new Error('Booking ID is required');
      return await getBookingById(bookingId);
    },
    enabled: options?.enabled !== false && !!bookingId,
  });
};

/**
 * Update booking mutation
 */
export const useUpdateBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, updates }: { bookingId: string; updates: Partial<Booking> }) => {
      await updateBooking(bookingId, updates);
      return { bookingId, updates };
    },
    onSuccess: ({ bookingId }) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
    },
  });
};

/**
 * Cancel booking mutation
 */
export const useCancelBooking = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason?: string }) => {
      await cancelBooking(bookingId, reason);
      return bookingId;
    },
    onSuccess: (bookingId) => {
      queryClient.invalidateQueries({ queryKey: bookingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) });
    },
  });
};

