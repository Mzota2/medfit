/**
 * Firebase Real-time Subscription Utilities
 * Helper functions for managing Firestore real-time listeners
 * Used by React Query real-time hooks for live data updates
 */

import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  Query,
  getDocs,
} from 'firebase/firestore';
import { COLLECTIONS } from '@/types/collections';
import { isRealtimeEnabled, getPollingInterval } from '@/lib/realtime/utils';
import { Report, ReportType, ReportStatus, ReportCategory } from '@/types/report';
import { Item, ItemStatus } from '@/types/item';
import { Order, OrderStatus } from '@/types/order';
import { Booking, BookingStatus } from '@/types/booking';
import { User } from '@/types/user';
import { Notification } from '@/types/notification';
import { LedgerEntry, LedgerEntryType } from '@/types/ledger';
import { Policy, PolicyType } from '@/types/policy';
import { business } from '@/types/business';
import { Category } from '@/types/category';
import { Promotion, PromotionStatus } from '@/types/promotion';
import { PaymentSession, PaymentSessionStatus } from '@/types/payment';
import { Review } from '@/types/reviews';
import { DeliveryProvider } from '@/types/delivery';

/**
 * Subscription manager to track and cleanup listeners
 */
class SubscriptionManager {
  private subscriptions: Map<string, Unsubscribe> = new Map();

  add(key: string, unsubscribe: Unsubscribe) {
    // Remove existing subscription if any
    this.remove(key);
    this.subscriptions.set(key, unsubscribe);
  }

  remove(key: string) {
    const unsubscribe = this.subscriptions.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  removeAll() {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
  }

  has(key: string): boolean {
    return this.subscriptions.has(key);
  }
}

export const subscriptionManager = new SubscriptionManager();

/**
 * Subscribe to products collection
 * Uses realtime listener if enabled, otherwise polls
 */
export const subscribeToProducts = async (
  callback: (products: Item[]) => void,
  options?: {
    status?: ItemStatus;
    categoryId?: string;
    businessId?: string;
    limit?: number;
    featured?: boolean;
  }
): Promise<Unsubscribe> => {
  const itemsRef = collection(db, COLLECTIONS.ITEMS);
  let q: Query = query(itemsRef, where('type', '==', 'product'));

  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }

  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }

  if (options?.categoryId) {
    q = query(q, where('categoryIds', 'array-contains', options.categoryId));
  }

  if (options?.featured !== undefined) {
    q = query(q, where('isFeatured', '==', options.featured));
  }

  q = query(q, orderBy('createdAt', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const enabled = await isRealtimeEnabled('products');
  
  if (enabled) {
    // Use realtime listener
    return onSnapshot(
      q,
      (snapshot) => {
        const products = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Item[];
        callback(products);
      },
      (error) => {
        console.error('Error subscribing to products:', error);
      }
    );
  } else {
    // Use polling
    const interval = await getPollingInterval();
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(q);
        const products = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Item[];
        callback(products);
      } catch (error) {
        console.error('Error polling products:', error);
      }
    };
    
    fetchData(); // Initial fetch
    pollingInterval = setInterval(fetchData, interval);
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
  }
};

/**
 * Subscribe to services collection
 * Uses realtime listener if enabled, otherwise polls
 */
export const subscribeToServices = async (
  callback: (services: Item[]) => void,
  options?: {
    status?: ItemStatus;
    categoryId?: string;
    businessId?: string;
    limit?: number;
    featured?: boolean;
  }
): Promise<Unsubscribe> => {
  const itemsRef = collection(db, COLLECTIONS.ITEMS);
  let q: Query = query(itemsRef, where('type', '==', 'service'));

  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }

  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }

  if (options?.categoryId) {
    q = query(q, where('categoryIds', 'array-contains', options.categoryId));
  }

  if (options?.featured !== undefined) {
    q = query(q, where('isFeatured', '==', options.featured));
  }

  q = query(q, orderBy('createdAt', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const enabled = await isRealtimeEnabled('services');
  
  if (enabled) {
    return onSnapshot(
      q,
      (snapshot) => {
        const services = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Item[];
        callback(services);
      },
      (error) => {
        console.error('Error subscribing to services:', error);
      }
    );
  } else {
    const interval = await getPollingInterval();
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(q);
        const services = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Item[];
        callback(services);
      } catch (error) {
        console.error('Error polling services:', error);
      }
    };
    
    fetchData();
    pollingInterval = setInterval(fetchData, interval);
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
  }
};

/**
 * Subscribe to orders collection
 * Uses realtime listener if enabled, otherwise polls
 */
export const subscribeToOrders = async (
  callback: (orders: Order[]) => void,
  options?: {
    customerId?: string;
    customerEmail?: string;
    status?: OrderStatus;
    limit?: number;
  }
): Promise<Unsubscribe> => {
  const ordersRef = collection(db, COLLECTIONS.ORDERS);
  let q: Query = query(ordersRef);

  if (options?.customerId) {
    q = query(q, where('customerId', '==', options.customerId));
  }

  if (options?.customerEmail) {
    q = query(q, where('customerEmail', '==', options.customerEmail));
  }

  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }

  q = query(q, orderBy('createdAt', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const enabled = await isRealtimeEnabled('orders');
  
  if (enabled) {
    return onSnapshot(
      q,
      (snapshot) => {
        const orders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        callback(orders);
      },
      (error) => {
        console.error('Error subscribing to orders:', error);
      }
    );
  } else {
    const interval = await getPollingInterval();
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(q);
        const orders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        callback(orders);
      } catch (error) {
        console.error('Error polling orders:', error);
      }
    };
    
    fetchData();
    pollingInterval = setInterval(fetchData, interval);
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
  }
};

/**
 * Subscribe to bookings collection
 * Uses realtime listener if enabled, otherwise polls
 */
export const subscribeToBookings = async (
  callback: (bookings: Booking[]) => void,
  options?: {
    customerId?: string;
    customerEmail?: string;
    serviceId?: string;
    status?: BookingStatus;
    limit?: number;
  }
): Promise<Unsubscribe> => {
  const bookingsRef = collection(db, COLLECTIONS.BOOKINGS);
  let q: Query = query(bookingsRef);

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

  const enabled = await isRealtimeEnabled('bookings');
  
  if (enabled) {
    return onSnapshot(
      q,
      (snapshot) => {
        const bookings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Booking[];
        callback(bookings);
      },
      (error) => {
        console.error('Error subscribing to bookings:', error);
      }
    );
  } else {
    const interval = await getPollingInterval();
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(q);
        const bookings = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Booking[];
        callback(bookings);
      } catch (error) {
        console.error('Error polling bookings:', error);
      }
    };
    
    fetchData();
    pollingInterval = setInterval(fetchData, interval);
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
  }
};

/**
 * Subscribe to customers (users with role='customer')
 * Uses realtime listener if enabled, otherwise polls
 */
export const subscribeToCustomers = async (
  callback: (customers: User[]) => void
): Promise<Unsubscribe> => {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const q = query(usersRef, where('role', '==', 'customer'), orderBy('createdAt', 'desc'));

  const enabled = await isRealtimeEnabled('customers');
  
  if (enabled) {
    return onSnapshot(
      q,
      (snapshot) => {
        const customers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];
        callback(customers);
      },
      (error) => {
        console.error('Error subscribing to customers:', error);
      }
    );
  } else {
    const interval = await getPollingInterval();
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(q);
        const customers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[];
        callback(customers);
      } catch (error) {
        console.error('Error polling customers:', error);
      }
    };
    
    fetchData();
    pollingInterval = setInterval(fetchData, interval);
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
  }
};

/**
 * Subscribe to admins/staff (users with role='admin' or 'staff')
 */
export const subscribeToAdminsStaff = (
  callback: (users: User[]) => void,
  role?: 'admin' | 'staff'
): Unsubscribe => {
  const usersRef = collection(db, COLLECTIONS.USERS);
  let q: Query = query(usersRef);

  if (role) {
    q = query(q, where('role', '==', role));
  } else {
    // Subscribe to both admins and staff
    // Note: Firestore doesn't support OR queries, so we'll need to handle this differently
    // For now, we'll subscribe to all users and filter client-side
    q = query(q, where('role', 'in', ['admin', 'staff']));
  }

  q = query(q, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      callback(users);
    },
    (error) => {
      console.error('Error subscribing to admins/staff:', error);
    }
  );
};

/**
 * Subscribe to notifications for a user
 * Uses realtime listener if enabled, otherwise polls
 */
export const subscribeToNotifications = async (
  callback: (notifications: Notification[]) => void,
  options?: {
    userId?: string;
    email?: string;
    unreadOnly?: boolean;
    limit?: number;
  }
): Promise<Unsubscribe> => {
  const notificationsRef = collection(db, COLLECTIONS.NOTIFICATIONS);
  let q: Query = query(notificationsRef);

  if (options?.userId) {
    q = query(q, where('recipient.userId', '==', options.userId));
  } else if (options?.email) {
    q = query(q, where('recipient.email', '==', options.email));
  }

  q = query(q, orderBy('createdAt', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const enabled = await isRealtimeEnabled('notifications');
  
  if (enabled) {
    return onSnapshot(
      q,
      (snapshot) => {
        let notifications = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];

        if (options?.unreadOnly) {
          notifications = notifications.filter((n) => !n.readAt);
        }

        callback(notifications);
      },
      (error) => {
        console.error('Error subscribing to notifications:', error);
      }
    );
  } else {
    const interval = await getPollingInterval();
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(q);
        let notifications = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[];

        if (options?.unreadOnly) {
          notifications = notifications.filter((n) => !n.readAt);
        }

        callback(notifications);
      } catch (error) {
        console.error('Error polling notifications:', error);
      }
    };
    
    fetchData();
    pollingInterval = setInterval(fetchData, interval);
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
  }
};

/**
 * Subscribe to ledger entries
 * Uses realtime listener if enabled, otherwise polls
 */
export const subscribeToLedgerEntries = async (
  callback: (entries: LedgerEntry[]) => void,
  options?: {
    entryType?: LedgerEntryType;
    status?: string;
    orderId?: string;
    bookingId?: string;
    paymentId?: string;
    limit?: number;
  }
): Promise<Unsubscribe> => {
  const ledgerRef = collection(db, COLLECTIONS.LEDGER);
  let q: Query = query(ledgerRef);

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

  q = query(q, orderBy('createdAt', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const enabled = await isRealtimeEnabled('ledger');
  
  if (enabled) {
    return onSnapshot(
      q,
      (snapshot) => {
        const entries = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LedgerEntry[];
        callback(entries);
      },
      (error) => {
        console.error('Error subscribing to ledger entries:', error);
      }
    );
  } else {
    const interval = await getPollingInterval();
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LedgerEntry[];
        callback(entries);
      } catch (error) {
        console.error('Error polling ledger entries:', error);
      }
    };
    
    fetchData();
    pollingInterval = setInterval(fetchData, interval);
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
  }
};

/**
 * Subscribe to businesses
 */
export const subscribeToBusinesses = (
  callback: (businesses: business[]) => void,
  options?: { limit?: number }
): Unsubscribe => {
  const businessesRef = collection(db, COLLECTIONS.BUSINESS);
  let q: Query = query(businessesRef, orderBy('createdAt', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const businesses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as business[];
      callback(businesses);
    },
    (error) => {
      console.error('Error subscribing to businesses:', error);
    }
  );
};

/**
 * Subscribe to policies
 */
export const subscribeToPolicies = (
  callback: (policies: Policy[]) => void,
  options?: {
    type?: PolicyType;
    activeOnly?: boolean;
    limit?: number;
  }
): Unsubscribe => {
  const policiesRef = collection(db, COLLECTIONS.POLICIES);
  let q: Query = query(policiesRef);

  if (options?.type) {
    q = query(q, where('type', '==', options.type));
  }

  if (options?.activeOnly) {
    q = query(q, where('isActive', '==', true));
  }

  q = query(q, orderBy('version', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const policies = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Policy[];
      callback(policies);
    },
    (error) => {
      console.error('Error subscribing to policies:', error);
    }
  );
};

/**
 * Subscribe to reports
 */
export const subscribeToReports = (
  callback: (reports: Report[]) => void,
  options?: {
    type?: ReportType;
    category?: ReportCategory;
    status?: ReportStatus;
    businessId?: string;
    limit?: number;
  }
): Unsubscribe => {
  const reportsRef = collection(db, COLLECTIONS.REPORTS);
  let q: Query = query(reportsRef);

  if (options?.type) {
    q = query(q, where('type', '==', options.type));
  }

  if (options?.category) {
    q = query(q, where('category', '==', options.category));
  }

  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }

  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }

  q = query(q, orderBy('generatedAt', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const reports = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Report[];
      callback(reports);
    },
    (error) => {
      console.error('Error subscribing to reports:', error);
    }
  );
};

/**
 * Subscribe to categories
 */
export const subscribeToCategories = (
  callback: (categories: Category[]) => void,
  options?: {
    type?: 'product' | 'service' | 'both';
    businessId?: string;
    limit?: number;
  }
): Unsubscribe => {
  const categoriesRef = collection(db, COLLECTIONS.CATEGORIES);
  let q: Query = query(categoriesRef);

  // If type is 'both', don't filter by type (return all categories)
  // If type is 'product' or 'service', filter by that specific type
  if (options?.type && options.type !== 'both') {
    q = query(q, where('type', '==', options.type));
  }

  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }

  q = query(q, orderBy('name', 'asc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const categories = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[];
      callback(categories);
    },
    (error) => {
      console.error('Error subscribing to categories:', error);
    }
  );
};

/**
 * Subscribe to promotions
 */
export const subscribeToPromotions = (
  callback: (promotions: Promotion[]) => void,
  options?: {
    status?: PromotionStatus;
    businessId?: string;
    limit?: number;
  }
): Unsubscribe => {
  const promotionsRef = collection(db, COLLECTIONS.PROMOTIONS);
  let q: Query = query(promotionsRef);

  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }

  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }

  q = query(q, orderBy('startDate', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const promotions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Promotion[];
      callback(promotions);
    },
    (error) => {
      console.error('Error subscribing to promotions:', error);
    }
  );
};

/**
 * Subscribe to payments
 * Uses realtime listener if enabled, otherwise polls
 */
export const subscribeToPayments = async (
  callback: (payments: (PaymentSession & { id: string })[]) => void,
  options?: {
    status?: PaymentSessionStatus;
    orderId?: string;
    bookingId?: string;
    businessId?: string;
    limit?: number;
  }
): Promise<Unsubscribe> => {
  const paymentsRef = collection(db, COLLECTIONS.PAYMENTS);
  let q: Query = query(paymentsRef);

  if (options?.status) {
    q = query(q, where('status', '==', options.status));
  }

  if (options?.orderId) {
    q = query(q, where('orderId', '==', options.orderId));
  }

  if (options?.bookingId) {
    q = query(q, where('bookingId', '==', options.bookingId));
  }

  q = query(q, orderBy('createdAt', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  const enabled = await isRealtimeEnabled('payments');
  
  if (enabled) {
    return onSnapshot(
      q,
      (snapshot) => {
        const payments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as (PaymentSession & { id: string })[];
        callback(payments);
      },
      (error) => {
        console.error('Error subscribing to payments:', error);
      }
    );
  } else {
    const interval = await getPollingInterval();
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(q);
        const payments = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as (PaymentSession & { id: string })[];
        callback(payments);
      } catch (error) {
        console.error('Error polling payments:', error);
      }
    };
    
    fetchData();
    pollingInterval = setInterval(fetchData, interval);
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
  }
};

/**
 * Subscribe to reviews
 */
export const subscribeToReviews = (
  callback: (reviews: Review[]) => void,
  options?: {
    itemId?: string;
    userId?: string;
    businessId?: string;
    limit?: number;
  }
): Unsubscribe => {
  const reviewsRef = collection(db, COLLECTIONS.REVIEWS);
  let q: Query = query(reviewsRef);

  if (options?.itemId) {
    q = query(q, where('itemId', '==', options.itemId));
  }

  if (options?.userId) {
    q = query(q, where('userId', '==', options.userId));
  }

  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }

  q = query(q, orderBy('createdAt', 'desc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const reviews = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
      callback(reviews);
    },
    (error) => {
      console.error('Error subscribing to reviews:', error);
    }
  );
};

/**
 * Subscribe to delivery providers collection
 */
export const subscribeToDeliveryProviders = (
  callback: (providers: (DeliveryProvider & { id: string })[]) => void,
  options?: {
    businessId?: string;
    isActive?: boolean;
    limit?: number;
  }
): Unsubscribe => {
  const providersRef = collection(db, COLLECTIONS.DELIVERY_PROVIDERS);
  let q: Query = query(providersRef);

  if (options?.businessId) {
    q = query(q, where('businessId', '==', options.businessId));
  }

  if (options?.isActive !== undefined) {
    q = query(q, where('isActive', '==', options.isActive));
  }

  q = query(q, orderBy('name', 'asc'));

  if (options?.limit) {
    q = query(q, limit(options.limit));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const providers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (DeliveryProvider & { id: string })[];
      callback(providers);
    },
    (error) => {
      console.error('Error subscribing to delivery providers:', error);
    }
  );
};

/**
 * Subscribe to a single document
 */
export const subscribeToDocument = <T>(
  collectionName: string,
  docId: string,
  callback: (data: T | null) => void
): Unsubscribe => {
  const docRef = doc(db, collectionName, docId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as T);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Error subscribing to document ${collectionName}/${docId}:`, error);
      callback(null);
    }
  );
};

