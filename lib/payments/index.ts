/**
 * Payments CRUD operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { PaymentSession, PaymentSessionStatus } from '@/types/payment';
import { NotFoundError } from '@/lib/utils/errors';

/**
 * Get payment by ID
 */
export const getPaymentById = async (paymentId: string): Promise<PaymentSession & { id: string }> => {
  const paymentRef = doc(db, COLLECTIONS.PAYMENTS, paymentId);
  const paymentSnap = await getDoc(paymentRef);

  if (!paymentSnap.exists()) {
    throw new NotFoundError('Payment');
  }

  return { id: paymentSnap.id, ...paymentSnap.data() } as PaymentSession & { id: string };
};

/**
 * Get payments with filters
 */
export const getPayments = async (options?: {
  status?: PaymentSessionStatus;
  orderId?: string;
  bookingId?: string;
  businessId?: string;
  limit?: number;
}): Promise<(PaymentSession & { id: string })[]> => {
  const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
  let q = query(paymentsRef);

  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }

  if (options?.orderId) {
    q = query(q, where('orderId', '==', options.orderId));
  }

  if (options?.bookingId) {
    q = query(q, where('bookingId', '==', options.bookingId));
  }

  // Note: Payments don't have businessId field, so we skip this filter
  // All payments are accessible to admins regardless of businessId
  // if (options?.businessId) {
  //   q = query(q, where('businessId', '==', options.businessId));
  // }

  q = query(q, orderBy('createdAt', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as (PaymentSession & { id: string })[];
};

