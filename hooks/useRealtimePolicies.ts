/**
 * Real-time subscription hook for policies
 * Works alongside React Query for live updates
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeToPolicies, subscriptionManager } from './firebase-subscriptions';
import { Policy, PolicyType } from '@/types/policy';
import { policyKeys } from './usePolicies';

interface UseRealtimePoliciesOptions {
  type?: PolicyType;
  activeOnly?: boolean;
  limit?: number;
  enabled?: boolean;
}

/**
 * Subscribe to real-time policy updates
 * Updates React Query cache when policies change
 */
export const useRealtimePolicies = (options?: UseRealtimePoliciesOptions) => {
  const queryClient = useQueryClient();
  const subscriptionKey = `policies-${JSON.stringify(options || {})}`;

  useEffect(() => {
    if (options?.enabled === false) {
      return;
    }

    const unsubscribe = subscribeToPolicies(
      (policies: Policy[]) => {
        console.log('[useRealtimePolicies] Received policies:', policies.length);
        // Update React Query cache with new data
        queryClient.setQueryData(
          policyKeys.list({
            type: options?.type,
            activeOnly: options?.activeOnly,
          }),
          policies
        );
      },
      {
        type: options?.type,
        activeOnly: options?.activeOnly,
        limit: options?.limit,
      }
    );

    subscriptionManager.add(subscriptionKey, unsubscribe);

    return () => {
      subscriptionManager.remove(subscriptionKey);
    };
  }, [
    options?.type,
    options?.activeOnly,
    options?.limit,
    options?.enabled,
    queryClient,
    subscriptionKey,
  ]);
};

