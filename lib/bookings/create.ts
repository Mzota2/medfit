/**
 * Booking creation utilities
 * Server-side booking creation logic
 */

import { CreateBookingInput, Booking, BookingStatus } from '@/types/booking';
import { generateBookingNumber } from '@/lib/utils/formatting';
import { COLLECTIONS } from '@/types/collections';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Create a booking in Firestore
 * This should be called from server-side code (API routes)
 */
export const createBooking = async (input: CreateBookingInput): Promise<string> => {
  const bookingNumber = generateBookingNumber();

  // Automatically get businessId
  const { getBusinessId } = await import('@/lib/businesses/utils');
  const businessId = await getBusinessId();

  // Get cancellation policy (would be fetched from Firestore)
  const cancellationPolicy = {
    version: 1,
    canCancel: true,
    cancelBeforeHours: 24,
    refundPercentage: 100,
    policyText: 'Cancellation policy text',
  };

  const bookingData: Omit<Booking, 'id'> = {
    bookingNumber,
    businessId,
    serviceId: input.serviceId,
    serviceName: '', // Would be fetched from service
    serviceImage: '', // Would be fetched from service
    customerId: input.customerId,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    status: BookingStatus.PENDING,
    timeSlot: input.timeSlot,
    pricing: {
      basePrice: 0, // Would be fetched from service
      tax: 0,
      discount: 0,
      total: 0, // Calculate total
      currency: 'MWK',
    },
    cancellationPolicy,
    notes: input.notes,
    createdAt: serverTimestamp() as unknown as Date,
    updatedAt: serverTimestamp() as unknown as Date,
  };

  const bookingRef = await addDoc(collection(db, COLLECTIONS.BOOKINGS), bookingData);
  return bookingRef.id;
};

