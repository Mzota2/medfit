/**
 * Firestore collection names constants
 * Single source of truth for all collection references
 */

export const COLLECTIONS = {
  BUSINESS: 'business',
  ITEMS: 'items',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  BOOKINGS: 'bookings',
  USERS: 'users',
  NOTIFICATIONS: 'notifications',
  PROMOTIONS: 'promotions',
  REVIEWS: 'reviews',
  SETTINGS: 'settings',
  POLICIES: 'policies',
  LEDGER: 'ledger',
  PAYMENTS: 'payments',
  REPORTS: 'reports',
  DELIVERY_PROVIDERS: 'delivery_providers',
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];

