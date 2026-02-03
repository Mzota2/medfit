/**
 * Real-time subscription hook for reports
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToReports, subscriptionManager } from './firebase-subscriptions';
import { Report, ReportType, ReportStatus, ReportCategory } from '@/types/report';
import { reportKeys } from './useReports';

interface UseRealtimeReportsOptions {
  type?: ReportType;
  category?: ReportCategory;
  status?: ReportStatus;
  businessId?: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * Subscribe to real-time report updates
 * Updates React Query cache when reports change
 */
export const useRealtimeReports = (options?: UseRealtimeReportsOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `reports-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    const unsubscribe = subscribeToReports(
      (reports: Report[]) => {
        console.log('[useRealtimeReports] Received reports:', reports.length);
        // Update React Query cache with new data
        queryClient.setQueryData(
          reportKeys.list({
            type: options?.type,
            category: options?.category,
            status: options?.status,
            businessId: options?.businessId,
          }),
          reports
        );
      },
      {
        type: options?.type,
        category: options?.category,
        status: options?.status,
        businessId: options?.businessId,
        limit: options?.limit,
      }
    );

    subscriptionManager.add(subscriptionKey, unsubscribe);

    return () => {
      subscriptionManager.remove(subscriptionKey);
    };
  }, [
    options?.type,
    options?.category,
    options?.status,
    options?.businessId,
    options?.limit,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

