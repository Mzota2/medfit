/**
 * Wrapper for Firestore subscriptions that checks settings
 * Falls back to polling when realtime is disabled
 */

import { Query, getDocs, Unsubscribe } from 'firebase/firestore';
import { isRealtimeEnabled, getPollingInterval } from './utils';
import { onSnapshot } from 'firebase/firestore';

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
    
    // Initial fetch
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(query);
        const data = transform(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        callback(data);
      } catch (error) {
        console.error(`Error polling ${collectionName}:`, error);
      }
    };
    
    // Start polling
    fetchData(); // Initial fetch
    pollingInterval = setInterval(fetchData, interval);
    
    // Return unsubscribe function
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
  }
};

