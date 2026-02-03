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
import { LedgerEntry, LedgerEntryType, LedgerEntryStatus } from '@/types/ledger';
import { NotFoundError } from '@/lib/utils/errors';
import { createLedgerEntry, reverseLedgerEntry } from './create';
import { OrderStatus } from '@/types/order';
import { BookingStatus } from '@/types/booking';
import { getOrders } from '@/lib/orders';
import { getBookings } from '@/lib/bookings';

export { createLedgerEntry, reverseLedgerEntry };

/**
 * Get ledger entry by ID
 */
export const getLedgerEntryById = async (entryId: string): Promise<LedgerEntry> => {
  const entryRef = doc(db, COLLECTIONS.LEDGER, entryId);
  const entrySnap = await getDoc(entryRef);
  
  if (!entrySnap.exists()) {
    throw new NotFoundError('Ledger entry');
  }
  
  return { id: entrySnap.id, ...entrySnap.data() } as LedgerEntry;
};

/**
 * Get ledger entries with filters
 */
export const getLedgerEntries = async (options?: {
  entryType?: LedgerEntryType;
  status?: LedgerEntryStatus;
  orderId?: string;
  bookingId?: string;
  paymentId?: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<LedgerEntry[]> => {
  const ledgerRef = collection(db, COLLECTIONS.LEDGER);
  let q = query(ledgerRef);
  
  if (options?.entryType) {
    q = query(q, where('entryType', '==', options.entryType));
  }
  
  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }
  
  if (options?.orderId) {
    q = query(q, where('orderId', '==', options.orderId));
  }
  
  if (options?.bookingId) {
    q = query(q, where('bookingId', '==', options.bookingId));
  }
  
  if (options?.paymentId) {
    q = query(q, where('paymentId', '==', options.paymentId));
  }
  
  if (options?.startDate) {
    q = query(q, where('createdAt', '>=', options.startDate));
  }
  
  if (options?.endDate) {
    q = query(q, where('createdAt', '<=', options.endDate));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as LedgerEntry[];
};

/**
 * Transaction data derived from orders and bookings (used when ledgers are disabled)
 */
export interface DerivedTransaction {
  id: string;
  entryType: LedgerEntryType;
  status: LedgerEntryStatus;
  amount: number;
  currency: string;
  orderId?: string;
  bookingId?: string;
  paymentId?: string;
  description: string;
  createdAt: Date | string;
  metadata?: Record<string, unknown>;
  source: 'order' | 'booking'; // Indicates the source of this transaction
}

/**
 * Get transaction data from successful orders and bookings
 * This is used as a fallback when ledger creation is disabled
 */
export const getDerivedTransactions = async (options?: {
  entryType?: LedgerEntryType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<DerivedTransaction[]> => {
  const transactions: DerivedTransaction[] = [];

  // Fetch successful orders (with payment confirmed)
  if (!options?.entryType || options.entryType === LedgerEntryType.ORDER_SALE) {
    const successfulOrderStatuses = [
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.COMPLETED,
    ];

    for (const status of successfulOrderStatuses) {
      const { orders } = await getOrders({
        status,
        limit: options?.limit ? Math.ceil(options.limit / 2) : 500,
      });

      for (const order of orders) {
        // Only include orders with confirmed payment
        if (!order.payment) continue;

        // Skip refunded orders
        if (order.refundedAt) continue;

        // Use payment date (paidAt) for filtering, fallback to createdAt
        const transactionDate = order.payment.paidAt 
          ? (order.payment.paidAt instanceof Date 
              ? order.payment.paidAt 
              : (order.payment.paidAt as { toDate?: () => Date })?.toDate?.() || new Date(String(order.payment.paidAt)))
          : (order.createdAt instanceof Date 
              ? order.createdAt 
              : (order.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(String(order.createdAt))) as Date;
        
        // Apply date filters if provided
        if (options?.startDate && transactionDate < options.startDate) continue;
        if (options?.endDate && transactionDate > options.endDate) continue;

        transactions.push({
          id: `order_${order.id}`,
          entryType: LedgerEntryType.ORDER_SALE,
          status: LedgerEntryStatus.CONFIRMED,
          amount: order.payment.amount,
          currency: order.payment.currency || order.pricing.currency,
          orderId: order.id,
          paymentId: order.payment.paymentId,
          description: `Order ${order.orderNumber} - ${order.items.length} item(s)`,
          createdAt: (() => {
            if (order.payment.paidAt instanceof Date) return order.payment.paidAt;
            if (order.payment.paidAt && typeof order.payment.paidAt === 'object' && 'toDate' in order.payment.paidAt) {
              const date = (order.payment.paidAt as { toDate: () => Date }).toDate();
              return date instanceof Date ? date : new Date();
            }
            if (order.createdAt instanceof Date) return order.createdAt;
            if (order.createdAt && typeof order.createdAt === 'object' && 'toDate' in order.createdAt) {
              const date = (order.createdAt as { toDate: () => Date }).toDate();
              return date instanceof Date ? date : new Date();
            }
            return new Date();
          })(),
          source: 'order',
          metadata: {
            orderNumber: order.orderNumber,
            customerEmail: order.customerEmail,
            customerName: order.customerName,
            itemCount: order.items.length,
          },
        });
      }
    }
  }

  // Fetch successful bookings (with payment confirmed)
  if (!options?.entryType || options.entryType === LedgerEntryType.BOOKING_PAYMENT) {
    const successfulBookingStatuses = [
      BookingStatus.PAID,
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
    ];

    for (const status of successfulBookingStatuses) {
      const { bookings } = await getBookings({
        status,
        limit: options?.limit ? Math.ceil(options.limit / 2) : 500,
      });

      for (const booking of bookings) {
        // Only include bookings with confirmed payment
        if (!booking.payment) continue;

        // Skip refunded bookings
        if (booking.refundedAt) continue;

        // Use payment date (paidAt) for filtering, fallback to createdAt
        const transactionDate = booking.payment.paidAt 
          ? (booking.payment.paidAt instanceof Date 
              ? booking.payment.paidAt 
              : (booking.payment.paidAt as { toDate?: () => Date })?.toDate?.() || new Date(String(booking.payment.paidAt)))
          : (booking.createdAt instanceof Date 
              ? booking.createdAt 
              : (booking.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(String(booking.createdAt))) as Date;
        
        // Apply date filters if provided
        if (options?.startDate && transactionDate < options.startDate) continue;
        if (options?.endDate && transactionDate > options.endDate) continue;

        transactions.push({
          id: `booking_${booking.id}`,
          entryType: LedgerEntryType.BOOKING_PAYMENT,
          status: LedgerEntryStatus.CONFIRMED,
          amount: booking.payment.amount,
          currency: booking.payment.currency || booking.pricing.currency,
          bookingId: booking.id,
          paymentId: booking.payment.paymentId,
          description: `Booking ${booking.bookingNumber} - ${booking.serviceName}`,
          createdAt: (() => {
            if (booking.payment.paidAt instanceof Date) return booking.payment.paidAt;
            if (booking.payment.paidAt && typeof booking.payment.paidAt === 'object' && 'toDate' in booking.payment.paidAt) {
              const date = (booking.payment.paidAt as { toDate: () => Date }).toDate();
              return date instanceof Date ? date : new Date();
            }
            if (booking.createdAt instanceof Date) return booking.createdAt;
            if (booking.createdAt && typeof booking.createdAt === 'object' && 'toDate' in booking.createdAt) {
              const date = (booking.createdAt as { toDate: () => Date }).toDate();
              return date instanceof Date ? date : new Date();
            }
            return new Date();
          })(),
          source: 'booking',
          metadata: {
            bookingNumber: booking.bookingNumber,
            serviceName: booking.serviceName,
            customerEmail: booking.customerEmail,
            customerName: booking.customerName,
            timeSlot: booking.timeSlot,
          },
        });
      }
    }
  }

  // Sort by date (newest first)
  transactions.sort((a, b) => {
    const aDate = a.createdAt instanceof Date 
      ? a.createdAt 
      : (a.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(String(a.createdAt));
    const bDate = b.createdAt instanceof Date 
      ? b.createdAt 
      : (b.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(String(b.createdAt));
    return bDate.getTime() - aDate.getTime();
  });

  // Apply limit if provided
  if (options?.limit) {
    return transactions.slice(0, options.limit);
  }

  return transactions;
};
