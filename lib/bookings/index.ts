import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { Booking, BookingStatus } from '@/types/booking';
import { NotFoundError, ValidationError } from '@/lib/utils/errors';
import { isValidBookingStatusTransition } from '@/lib/utils/validation';
import { createBooking } from './create';
import { reverseLedgerEntry } from '@/lib/ledger/create';
import { LedgerEntryType } from '@/types/ledger';

export { createBooking };

/**
 * Get booking by ID
 */
export const getBookingById = async (bookingId: string): Promise<Booking> => {
  const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
  const bookingSnap = await getDoc(bookingRef);
  
  if (!bookingSnap.exists()) {
    throw new NotFoundError('Booking');
  }
  
  const data = bookingSnap.data();
  
  // Convert Firestore Timestamps to JavaScript Date objects
  return convertBookingData(bookingSnap.id, data);
};

/**
 * Convert Firestore booking data to Booking type with proper date conversions
 */
const convertBookingData = (docId: string, data: Record<string, unknown>): Booking => {
  const convertTimestamp = (ts: unknown): Date => {
    if (ts instanceof Date) return ts;
    if (ts && typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function') {
      return (ts as { toDate: () => Date }).toDate();
    }
    try {
      return new Date(String(ts));
    } catch {
      return new Date();
    }
  };

  const timeSlot = data.timeSlot as { startTime?: unknown; endTime?: unknown } | undefined;
  const payment = data.payment as { paidAt?: unknown } | undefined;

  return {
    id: docId,
    ...data,
    // Convert timeSlot timestamps
    timeSlot: timeSlot ? {
      ...timeSlot,
      startTime: convertTimestamp(timeSlot.startTime),
      endTime: convertTimestamp(timeSlot.endTime),
    } : { startTime: new Date(), endTime: new Date() },
    // Convert payment.paidAt if it exists
    ...(payment && {
      payment: {
        ...payment,
        paidAt: convertTimestamp(payment.paidAt),
      },
    }),
    // Convert other date fields
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
    ...(data.canceledAt ? { canceledAt: convertTimestamp(data.canceledAt) } : {}),
    ...(data.noShowAt ? { noShowAt: convertTimestamp(data.noShowAt) } : {}),
    ...(data.refundedAt ? { refundedAt: convertTimestamp(data.refundedAt) } : {}),
  } as unknown as Booking;
};

/**
 * Get booking by booking number
 */
export const getBookingByNumber = async (bookingNumber: string): Promise<Booking | null> => {
  const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);
  const q = query(bookingsRef, where('bookingNumber', '==', bookingNumber), limit(1));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return convertBookingData(doc.id, doc.data());
};

/**
 * Get bookings with filters
 */
export const getBookings = async (options?: {
  customerId?: string;
  customerEmail?: string;
  serviceId?: string;
  status?: BookingStatus;
  limit?: number;
  lastDocId?: string;
}): Promise<{ bookings: Booking[]; lastDocId?: string; hasMore: boolean }> => {
  const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);
  let q = query(bookingsRef);
  
  if (options?.customerId) {
    q = query(q, where('customerId', '==', options.customerId));
  }
  
  if (options?.customerEmail) {
    q = query(q, where('customerEmail', '==', options.customerEmail));
  }
  
  if (options?.serviceId) {
    q = query(q, where('serviceId', '==', options.serviceId));
  }
  
  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const querySnapshot = await getDocs(q);
  const bookings = querySnapshot.docs.map(doc => convertBookingData(doc.id, doc.data()));
  
  const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
  const hasMore = querySnapshot.docs.length === (options?.limit || 10);
  
  return {
    bookings,
    lastDocId: lastDoc?.id,
    hasMore
  };
};

/**
 * Update booking
 */
export const updateBooking = async (bookingId: string, updates: Partial<Booking>): Promise<void> => { 
  const bookingRef = doc(db, COLLECTIONS.BOOKINGS, bookingId);
  const bookingSnap = await getDoc(bookingRef);
  
  if (!bookingSnap.exists()) {
    throw new NotFoundError('Booking');
  }
  
  const currentBooking = convertBookingData(bookingSnap.id, bookingSnap.data());
  
  // Validate status transition if status is being updated
  if (updates.status && updates.status !== currentBooking.status) {
    if (!isValidBookingStatusTransition(currentBooking.status, updates.status)) {
      throw new ValidationError(
        `Cannot change booking status from ${currentBooking.status} to ${updates.status}. Invalid status transition.`
      );
    }
  }
  
  await updateDoc(bookingRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Cancel booking
 */
export const cancelBooking = async (bookingId: string, reason?: string, canceledBy?: string): Promise<void> => {
  const booking = await getBookingById(bookingId);
  
  if (booking.status === BookingStatus.COMPLETED) {
    throw new ValidationError('Cannot cancel a completed booking');
  }
  
  if (booking.status === BookingStatus.CANCELED) {
    throw new ValidationError('Booking is already canceled');
  }
  
  // Build update object, only including canceledReason if it's provided
  const updates: Partial<Booking> = {
    status: BookingStatus.CANCELED,
    canceledAt: new Date(),
  };
  
  // Only add canceledReason if it's provided (not undefined or empty)
  if (reason && reason.trim()) {
    updates.canceledReason = reason.trim();
  }
  
  // If booking was paid, create ledger reversal entry
  if (booking.payment && booking.payment.amount > 0) {
    try {
      // Find the original ledger entry for this booking
      const ledgerRef = collection(db, COLLECTIONS.LEDGER);
      // Query by bookingId and entryType (orderBy requires an index, so we'll filter client-side if needed)
      let ledgerQuery = query(
        ledgerRef,
        where('bookingId', '==', bookingId),
        where('entryType', '==', LedgerEntryType.BOOKING_PAYMENT)
      );
      
      // Try to order by createdAt, but if index doesn't exist, we'll sort client-side
      try {
        ledgerQuery = query(ledgerQuery, orderBy('createdAt', 'desc'), limit(1));
      } catch {
        // If index doesn't exist, we'll get all and sort client-side
        console.warn('Could not order ledger query by createdAt, will sort client-side');
      }
      
      const ledgerDocs = await getDocs(ledgerQuery);
      
      if (!ledgerDocs.empty) {
        // Sort by createdAt if we couldn't use orderBy in query
        const sortedDocs = ledgerDocs.docs.sort((a, b) => {
          const aTime = a.data().createdAt?.toMillis?.() || 0;
          const bTime = b.data().createdAt?.toMillis?.() || 0;
          return bTime - aTime; // Descending order (newest first)
        });
        
        const originalLedgerEntry = sortedDocs[0];
        const originalEntryId = originalLedgerEntry.id;
        
        // Create reversal entry
        const reversalReason = reason 
          ? `Booking cancellation: ${reason.trim()}`
          : 'Booking cancellation';
        
        const reversedBy = canceledBy || 'customer';
        
        await reverseLedgerEntry(originalEntryId, reversalReason, reversedBy);
        
        // Update booking with refund information
        updates.refundedAt = new Date();
        updates.refundedAmount = booking.payment.amount;
        updates.refundedReason = reversalReason;
        
        console.log(`Ledger reversal created for canceled booking ${bookingId}, original entry: ${originalEntryId}`);
      } else {
        console.warn(`No ledger entry found for booking ${bookingId} - cannot create reversal`);
      }
    } catch (error) {
      console.error(`Error creating ledger reversal for booking ${bookingId}:`, error);
      // Don't fail the cancellation if ledger reversal fails
      // The booking will still be canceled, but refund tracking may be incomplete
    }
  }
  
  await updateBooking(bookingId, updates);
  
  // Create notification for booking cancellation
  try {
    const { notifyBookingCancellation } = await import('@/lib/notifications');
    await notifyBookingCancellation({
      customerEmail: booking.customerEmail || '',
      customerId: booking.customerId,
      bookingId,
      bookingNumber: booking.bookingNumber,
      reason: reason,
      refundAmount: booking.payment?.amount,
      currency: booking.payment?.currency || 'MWK',
    });
  } catch (notifError) {
    console.error(`Error creating booking cancellation notification:`, notifError);
    // Don't fail cancellation if notification fails
  }
};
