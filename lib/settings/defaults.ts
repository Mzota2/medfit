/**
 * Default settings values for cost control
 * These defaults are cost-optimized based on the plan
 */

import { 
  Settings, 
  RealtimeOptions, 
  NotificationOptions, 
  LedgerOptions, 
  DocumentCreationOptions, 
  PerformanceOptions,
  StoreType 
} from '@/types/settings';
import { OrderStatus } from '@/types/order';
import { BookingStatus } from '@/types/booking';

/**
 * Default realtime options (cost-optimized)
 * Only critical collections enabled by default
 */
export const defaultRealtimeOptions: RealtimeOptions = {
  enabled: true,
  orders: true, // Critical for admin
  bookings: true, // Critical for admin
  products: false, // Can use polling
  services: false, // Can use polling
  customers: false, // Can use polling
  notifications: true, // Critical for UX
  payments: true, // Critical for admin
  ledger: false, // Can be disabled if not needed
  categories: false,
  deliveryProviders: false,
  reviews: false,
  promotions: false,
  policies: false,
  staff: false,
  businesses: false,
  reports: false,
  pollingInterval: 30, // 30 seconds for disabled collections
};

/**
 * Default notification options (only 4 critical notifications)
 */
export const defaultNotificationOptions: NotificationOptions = {
  enabled: true,
  // CRITICAL notifications (enabled by default)
  orderPaid: true, // CRITICAL
  bookingPaid: true, // CRITICAL
  orderCompleted: true, // CRITICAL
  bookingCompleted: true, // CRITICAL
  // Optional notifications (disabled by default)
  paymentSuccess: false, // Covered by orderPaid/bookingPaid
  paymentFailed: false,
  orderCreated: false,
  orderShipped: false,
  orderCanceled: false,
  bookingCreated: false,
  bookingConfirmed: false,
  bookingCanceled: false,
  bookingReminder: false,
  customerSupport: true,
  adminSupport: true,
  systemAlert: false,
  channels: {
    inApp: true, // Always enabled
    push: false, // Disable if not using FCM
    email: false, // Disable if not configured
    sms: false, // Disable if not configured
  },
  batchNotifications: false,
  notificationRetentionDays: 90,
};

/**
 * Default ledger options (manual generation by default)
 */
export const defaultLedgerOptions: LedgerOptions = {
  enabled: false, // Disable auto-creation
  manualGeneration: true, // Generate from orders/bookings when needed
  generateFromOrders: true,
  generateFromBookings: true,
  orderStatusesForLedger: [OrderStatus.PAID, OrderStatus.COMPLETED],
  bookingStatusesForLedger: [BookingStatus.PAID, BookingStatus.COMPLETED],
  // Auto-creation options (not used when manualGeneration=true)
  paymentTransactions: false,
  refundTransactions: false,
  adjustmentTransactions: false,
};

/**
 * Default document creation options
 */
export const defaultDocumentCreationOptions: DocumentCreationOptions = {
  createPaymentDocuments: true, // Usually needed
  createCustomerDocuments: true, // Usually needed
  createReviewDocuments: false, // Can be disabled
  enableReviews: false, // Disable reviews feature by default
  autoDeleteOldNotifications: true,
  notificationRetentionDays: 90,
  autoDeleteOldPayments: false, // Keep payment history
  paymentRetentionDays: 365,
};

/**
 * Default performance options (cost-optimized)
 */
export const defaultPerformanceOptions: PerformanceOptions = {
  enablePagination: true,
  defaultPageSize: 20,
  maxPageSize: 100,
  enforceQueryLimits: true, // Force limits on all queries
  defaultQueryLimit: 50, // Default when not specified
  enableFieldSelection: true, // Only fetch needed fields
  enableCache: true,
  cacheTTL: 300, // 5 minutes
  enableBatchWrites: true,
  batchSize: 500,
  analyticsLoadStrategy: 'paginated', // Instead of 'all'
  analyticsPageSize: 50, // Load 50 records at a time
  enableLazyRealtime: true, // Only enable when page visible
  realtimeDebounceMs: 500, // Debounce updates
};

/**
 * Get default settings with cost-optimized values
 */
export const getDefaultSettings = (): Omit<Settings, 'id' | 'createdAt' | 'updatedAt' | 'businessId'> => {
  return {
    storeType: StoreType.BOTH, // Default to both for backward compatibility
    delivery: {
      enabled: true,
      cost: 0,
      currency: 'MWK',
    },
    payment: {
      enabled: true,
      methods: [],
      currency: 'MWK',
      taxRate: 0,
    },
    analytics: {
      enabled: false,
      trackingId: '',
    },
    // Cost control settings with optimized defaults
    realtime: defaultRealtimeOptions,
    notifications: defaultNotificationOptions,
    ledger: defaultLedgerOptions,
    documentCreation: defaultDocumentCreationOptions,
    performance: defaultPerformanceOptions,
  };
};

/**
 * Merge existing settings with defaults (for migration)
 * Ensures all new fields are present with defaults
 */
export const mergeSettingsWithDefaults = (existing: Partial<Settings>): Settings => {
  const defaults = getDefaultSettings();
  
  return {
    ...defaults,
    ...existing,
    // Merge nested objects
    delivery: { ...defaults.delivery, ...existing.delivery },
    payment: { ...defaults.payment, ...existing.payment },
    analytics: { ...defaults.analytics, ...existing.analytics },
    realtime: { ...defaults.realtime, ...existing.realtime },
    notifications: { 
      ...defaults.notifications, 
      ...existing.notifications,
      channels: { 
        ...defaults.notifications?.channels, 
        ...existing.notifications?.channels 
      },
    },
    ledger: { ...defaults.ledger, ...existing.ledger },
    documentCreation: { ...defaults.documentCreation, ...existing.documentCreation },
    performance: { ...defaults.performance, ...existing.performance },
  } as Settings;
};

