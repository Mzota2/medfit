/**
 * React Query hook for Derived Transactions
 * Used when ledger creation is disabled - shows transaction data from orders and bookings
 */

import { useQuery } from '@tanstack/react-query';
import { getDerivedTransactions, DerivedTransaction } from '@/lib/ledger';
import { LedgerEntryType } from '@/types/ledger';

/**
 * Query key factory for derived transactions
 */
export const derivedTransactionKeys = {
  all: ['derivedTransactions'] as const,
  lists: () => [...derivedTransactionKeys.all, 'list'] as const,
  list: (filters: {
    entryType?: LedgerEntryType;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) => [...derivedTransactionKeys.lists(), filters] as const,
};

/**
 * Fetch derived transactions from orders and bookings
 */
export const useDerivedTransactions = (options?: {
  entryType?: LedgerEntryType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: derivedTransactionKeys.list({
      entryType: options?.entryType,
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: options?.limit,
    }),
    queryFn: async () => {
      return await getDerivedTransactions({
        entryType: options?.entryType,
        startDate: options?.startDate,
        endDate: options?.endDate,
        limit: options?.limit,
      });
    },
    enabled: options?.enabled !== false,
  });
};

