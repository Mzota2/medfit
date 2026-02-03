/**
 * React Query hooks for Policies
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPolicies, getPolicyById, getActivePolicyByType, createPolicy, updatePolicy, deletePolicy } from '@/lib/policies';
import { Policy, PolicyType } from '@/types/policy';

/**
 * Query key factory for policies
 */
export const policyKeys = {
  all: ['policies'] as const,
  lists: () => [...policyKeys.all, 'list'] as const,
  list: (filters: {
    type?: PolicyType;
    activeOnly?: boolean;
    businessId?: string;
  }) => [...policyKeys.lists(), filters] as const,
  activeByType: (type: PolicyType, businessId?: string) =>
    [...policyKeys.all, 'active', type, businessId] as const,
  details: () => [...policyKeys.all, 'detail'] as const,
  detail: (id: string) => [...policyKeys.details(), id] as const,
};

/**
 * Fetch policies with filters
 */
export const usePolicies = (options?: {
  type?: PolicyType;
  activeOnly?: boolean;
  businessId?: string;
  limit?: number;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: policyKeys.list({
      type: options?.type,
      activeOnly: options?.activeOnly,
      businessId: options?.businessId,
    }),
    queryFn: async () => {
      return await getPolicies({
        type: options?.type,
        activeOnly: options?.activeOnly,
        businessId: options?.businessId,
        limit: options?.limit,
      });
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch active policy by type
 */
export const useActivePolicyByType = (type: PolicyType, businessId?: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: policyKeys.activeByType(type, businessId),
    queryFn: async () => {
      return await getActivePolicyByType(type, businessId);
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single policy by ID
 */
export const usePolicy = (policyId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: policyKeys.detail(policyId || ''),
    queryFn: async () => {
      if (!policyId) throw new Error('Policy ID is required');
      return await getPolicyById(policyId);
    },
    enabled: options?.enabled !== false && !!policyId,
  });
};

/**
 * Create policy mutation
 */
export const useCreatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      policyData,
      businessId,
    }: {
      policyData: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>;
      businessId?: string;
    }) => {
      return await createPolicy(policyData, businessId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
    },
  });
};

/**
 * Update policy mutation
 */
export const useUpdatePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ policyId, updates }: { policyId: string; updates: Partial<Policy> }) => {
      await updatePolicy(policyId, updates);
      return { policyId, updates };
    },
    onSuccess: ({ policyId }) => {
      queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: policyKeys.detail(policyId) });
    },
  });
};

/**
 * Delete policy mutation
 */
export const useDeletePolicy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (policyId: string) => {
      await deletePolicy(policyId);
      return policyId;
    },
    onSuccess: (policyId) => {
      queryClient.removeQueries({ queryKey: policyKeys.detail(policyId) });
      queryClient.invalidateQueries({ queryKey: policyKeys.lists() });
    },
  });
};

