/**
 * Realtime listener utility functions
 * Checks settings to determine if realtime should be used or polling
 */

import { getSettings } from '@/lib/settings';

export type CollectionName = 
  | 'orders' 
  | 'bookings' 
  | 'products' 
  | 'services' 
  | 'customers' 
  | 'notifications' 
  | 'payments' 
  | 'ledger' 
  | 'categories' 
  | 'deliveryProviders' 
  | 'reviews' 
  | 'promotions' 
  | 'policies' 
  | 'staff' 
  | 'businesses' 
  | 'reports';

/**
 * Check if realtime listeners are enabled for a specific collection
 */
export const isRealtimeEnabled = async (collection: CollectionName): Promise<boolean> => {
  try {
    const settings = await getSettings();
    const realtimeSettings = settings?.realtime;

    // If realtime is globally disabled, return false
    if (!realtimeSettings?.enabled) {
      return false;
    }

    // Check specific collection
    switch (collection) {
      case 'orders':
        return realtimeSettings.orders ?? true;
      case 'bookings':
        return realtimeSettings.bookings ?? true;
      case 'products':
        return realtimeSettings.products ?? false;
      case 'services':
        return realtimeSettings.services ?? false;
      case 'customers':
        return realtimeSettings.customers ?? false;
      case 'notifications':
        return realtimeSettings.notifications ?? true;
      case 'payments':
        return realtimeSettings.payments ?? true;
      case 'ledger':
        return realtimeSettings.ledger ?? false;
      case 'categories':
        return realtimeSettings.categories ?? false;
      case 'deliveryProviders':
        return realtimeSettings.deliveryProviders ?? false;
      case 'reviews':
        return realtimeSettings.reviews ?? false;
      case 'promotions':
        return realtimeSettings.promotions ?? false;
      case 'policies':
        return realtimeSettings.policies ?? false;
      case 'staff':
        return realtimeSettings.staff ?? false;
      case 'businesses':
        return realtimeSettings.businesses ?? false;
      case 'reports':
        return realtimeSettings.reports ?? false;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking realtime settings:', error);
    // On error, default to enabled for critical collections
    return ['orders', 'bookings', 'notifications', 'payments'].includes(collection);
  }
};

/**
 * Get polling interval from settings (in milliseconds)
 */
export const getPollingInterval = async (): Promise<number> => {
  try {
    const settings = await getSettings();
    const interval = settings?.realtime?.pollingInterval ?? 30; // Default 30 seconds
    return interval * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Error getting polling interval:', error);
    return 30000; // Default 30 seconds in milliseconds
  }
};

