/**
 * Helper function to create smart subscriptions (realtime or polling)
 */

import { Query, getDocs, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { isRealtimeEnabled, getPollingInterval } from './utils';

/**
 * Create a subscription that respects realtime settings
 * Falls back to polling if realtime is disabled
 */
export const createSmartSubscription = async <T>(
  collectionName: string,
  query: Query,
  callback: (data: T[]) => void,
  transform: (docs: unknown[]) => T[]
): Promise<Unsubscribe> => {
  const enabled = await isRealtimeEnabled(collectionName as 'products' | 'services' | 'orders' | 'bookings' | 'notifications' | 'ledger' | 'payments');
  
  if (enabled) {
    // Use realtime listener
    return onSnapshot(
      query,
      (snapshot) => {
        const data = transform(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        callback(data);
      },
      (error) => {
        console.error(`Error subscribing to ${collectionName}:`, error);
      }
    );
  } else {
    // Use polling
    const interval = await getPollingInterval();
    let pollingInterval: NodeJS.Timeout | null = null;
    
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(query);
        const data = transform(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        callback(data);
      } catch (error) {
        console.error(`Error polling ${collectionName}:`, error);
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

