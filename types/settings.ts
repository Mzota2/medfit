import { BaseDocument } from "./common";
import { OrderStatus } from "./order";
import { BookingStatus } from "./booking";

/**
 * Store type - determines what the business sells
 */
export enum StoreType {
  PRODUCTS_ONLY = 'products_only',
  SERVICES_ONLY = 'services_only',
  BOTH = 'both',
}

export interface DeliveryOptions {
  enabled: boolean;
  cost: number;
  currency: string;
}

export interface PaymentOptions {
  enabled: boolean;
  methods: string[];
  currency: string;
  taxRate: number;
}

export interface AnalyticsOptions {
  enabled: boolean;
  trackingId: string;
}

/**
 * Realtime listener controls
 */
export interface RealtimeOptions {
  enabled: boolean;
  // Granular control per collection
  orders: boolean;
  bookings: boolean;
  products: boolean;
  services: boolean;
  customers: boolean;
  notifications: boolean;
  payments: boolean;
  ledger: boolean;
  categories: boolean;
  deliveryProviders: boolean;
  reviews: boolean;
  promotions: boolean;
  policies: boolean;
  staff: boolean;
  businesses: boolean;
  reports: boolean;
  // Global refresh interval (polling fallback when realtime disabled)
  pollingInterval?: number; // in seconds, e.g., 30, 60, 120
}

/**
 * Notification controls - only critical notifications enabled by default
 */
export interface NotificationOptions {
  enabled: boolean;
  // CRITICAL notifications only (per user feedback)
  orderPaid: boolean; // CRITICAL
  bookingPaid: boolean; // CRITICAL
  orderCompleted: boolean; // CRITICAL
  bookingCompleted: boolean; // CRITICAL
  // Optional notifications (can be disabled)
  paymentSuccess: boolean; // Can be disabled (covered by orderPaid/bookingPaid)
  paymentFailed: boolean;
  orderCreated: boolean;
  orderShipped: boolean;
  orderCanceled: boolean;
  bookingCreated: boolean;
  bookingConfirmed: boolean;
  bookingCanceled: boolean;
  bookingReminder: boolean;
  customerSupport: boolean;
  adminSupport: boolean;
  systemAlert: boolean;
  // Channel control
  channels: {
    inApp: boolean; // Always enabled (required for UI)
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  // Batch settings
  batchNotifications: boolean; // Group multiple notifications
  notificationRetentionDays: number; // Auto-delete old notifications
}

/**
 * Ledger controls - manual generation by default
 */
export interface LedgerOptions {
  enabled: boolean; // If false, don't auto-create ledger entries
  // Manual generation mode: Generate ledger from orders/bookings on-demand
  manualGeneration: boolean; // If true, generate ledger from orders/bookings when needed
  // Auto-creation options (only if enabled=true and manualGeneration=false)
  paymentTransactions: boolean;
  refundTransactions: boolean;
  adjustmentTransactions: boolean;
  // Optional: Create ledger entries only for transactions above threshold
  minimumAmount?: number;
  minimumCurrency?: string;
  // Manual generation settings
  generateFromOrders: boolean; // Generate from orders with status PAID, COMPLETED
  generateFromBookings: boolean; // Generate from bookings with status PAID, COMPLETED
  // Status filters for manual generation
  orderStatusesForLedger: OrderStatus[]; // e.g., [PAID, COMPLETED]
  bookingStatusesForLedger: BookingStatus[]; // e.g., [PAID, COMPLETED]
}

/**
 * Document creation controls
 */
export interface DocumentCreationOptions {
  // Control automatic document creation
  createPaymentDocuments: boolean; // Payment sessions
  createCustomerDocuments: boolean; // Auto-create customer records
  createReviewDocuments: boolean; // Auto-create review records - CAN BE DISABLED
  enableReviews: boolean; // Master switch for reviews feature (disables all review functionality)
  // Retention policies
  autoDeleteOldNotifications: boolean;
  notificationRetentionDays: number;
  autoDeleteOldPayments: boolean;
  paymentRetentionDays: number;
}

/**
 * Performance and query optimization options
 */
export interface PerformanceOptions {
  // Query optimization
  enablePagination: boolean;
  defaultPageSize: number; // 10, 20, 50, 100
  maxPageSize: number; // Prevent large queries
  // Force limits on all queries (prevent unlimited queries)
  enforceQueryLimits: boolean; // If true, all queries must have a limit
  defaultQueryLimit: number; // Default limit when not specified (e.g., 50)
  // Field selection (only fetch needed fields)
  enableFieldSelection: boolean; // Only fetch required fields
  // Caching
  enableCache: boolean;
  cacheTTL: number; // in seconds
  // Batch operations
  enableBatchWrites: boolean;
  batchSize: number; // Firestore batch limit is 500
  // Analytics page optimization
  analyticsLoadStrategy: 'all' | 'paginated' | 'lazy'; // How to load analytics data
  analyticsPageSize: number; // For paginated/lazy loading
  // Realtime listener optimization
  enableLazyRealtime: boolean; // Only enable realtime when page is active/visible
  realtimeDebounceMs: number; // Debounce realtime updates (e.g., 500ms)
}

export interface Settings extends BaseDocument {
  storeType?: StoreType; // Store type: products only, services only, or both
  delivery: DeliveryOptions;
  payment: PaymentOptions;
  analytics: AnalyticsOptions;
  // NEW: Cost control settings
  realtime?: RealtimeOptions;
  notifications?: NotificationOptions;
  ledger?: LedgerOptions;
  documentCreation?: DocumentCreationOptions;
  performance?: PerformanceOptions;
}