/**
 * React Query hooks for Ledger Entries
 */

import { useQuery } from '@tanstack/react-query';
import { getLedgerEntries, getLedgerEntryById } from '@/lib/ledger';
import { LedgerEntry, LedgerEntryType, LedgerEntryStatus } from '@/types/ledger';

/**
 * Query key factory for ledger entries
 */
export const ledgerEntryKeys = {
  all: ['ledgerEntries'] as const,
  lists: () => [...ledgerEntryKeys.all, 'list'] as const,
  list: (filters: {
    entryType?: LedgerEntryType;
    status?: LedgerEntryStatus;
    orderId?: string;
    bookingId?: string;
    paymentId?: string;
    startDate?: Date;
    endDate?: Date;
  }) => [...ledgerEntryKeys.lists(), filters] as const,
  details: () => [...ledgerEntryKeys.all, 'detail'] as const,
  detail: (id: string) => [...ledgerEntryKeys.details(), id] as const,
};

/**
 * Fetch ledger entries with filters
 */
export const useLedgerEntries = (options?: {
  entryType?: LedgerEntryType;
  status?: LedgerEntryStatus;
  orderId?: string;
  bookingId?: string;
  paymentId?: string;
  businessId?: string;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: ledgerEntryKeys.list({
      entryType: options?.entryType,
      status: options?.status,
      orderId: options?.orderId,
      bookingId: options?.bookingId,
      paymentId: options?.paymentId,
      startDate: options?.startDate,
      endDate: options?.endDate,
    }),
    queryFn: async () => {
      return await getLedgerEntries({
        entryType: options?.entryType,
        status: options?.status,
        orderId: options?.orderId,
        bookingId: options?.bookingId,
        paymentId: options?.paymentId,
        limit: options?.limit,
        startDate: options?.startDate,
        endDate: options?.endDate,
      });
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single ledger entry by ID
 */
export const useLedgerEntry = (entryId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ledgerEntryKeys.detail(entryId || ''),
    queryFn: async () => {
      if (!entryId) throw new Error('Entry ID is required');
      return await getLedgerEntryById(entryId);
    },
    enabled: options?.enabled !== false && !!entryId,
  });
};

