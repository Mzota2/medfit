/**
 * Real-time subscription hook for ledger entries
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToLedgerEntries, subscriptionManager } from '@/hooks/firebase-subscriptions';
import { LedgerEntry, LedgerEntryType, LedgerEntryStatus } from '@/types/ledger';
import { ledgerEntryKeys } from './useLedgerEntries';

interface UseRealtimeLedgerEntriesOptions {
  entryType?: LedgerEntryType;
  status?: string;
  orderId?: string;
  bookingId?: string;
  paymentId?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Subscribe to real-time ledger entry updates
 * Updates React Query cache when entries change
 */
export const useRealtimeLedgerEntries = (options?: UseRealtimeLedgerEntriesOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `ledger-entries-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    let unsubscribe: (() => void) | null = null;

    // Handle async subscription
    subscribeToLedgerEntries(
      (entries: LedgerEntry[]) => {
        console.log('[useRealtimeLedgerEntries] Received entries:', entries.length);
        // Update React Query cache with new data
        queryClient.setQueryData(
          ledgerEntryKeys.list({
            entryType: options?.entryType,
            status: options?.status as LedgerEntryStatus | undefined,
            orderId: options?.orderId,
            bookingId: options?.bookingId,
            paymentId: options?.paymentId,
          }),
          entries
        );
      },
      {
        entryType: options?.entryType,
        status: options?.status,
        orderId: options?.orderId,
        bookingId: options?.bookingId,
        paymentId: options?.paymentId,
        limit: options?.limit,
      }
    ).then((unsub) => {
      unsubscribe = unsub;
      subscriptionManager.add(subscriptionKey, unsub);
    }).catch((error) => {
      console.error('[useRealtimeLedgerEntries] Error setting up subscription:', error);
    });

    return () => {
      if (unsubscribe) {
        subscriptionManager.remove(subscriptionKey);
      }
    };
  }, [
    options?.entryType,
    options?.status,
    options?.orderId,
    options?.bookingId,
    options?.paymentId,
    options?.limit,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

