/**
 * React Query hooks for Customers (Users with role='customer')
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomers, getUserById, getUserByUid, getUserByEmail, updateUser, updateUserByUid, deleteUser } from '@/lib/users';
import { User } from '@/types/user';

/**
 * Query key factory for customers
 */
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: () => [...customerKeys.lists()] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  byUid: (uid: string) => [...customerKeys.all, 'uid', uid] as const,
  byEmail: (email: string) => [...customerKeys.all, 'email', email] as const,
};

/**
 * Fetch all customers
 */
export const useCustomers = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: customerKeys.list(),
    queryFn: async () => {
      return await getCustomers();
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch single customer by ID
 */
export const useCustomer = (customerId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: customerKeys.detail(customerId || ''),
    queryFn: async () => {
      if (!customerId) throw new Error('Customer ID is required');
      return await getUserById(customerId);
    },
    enabled: options?.enabled !== false && !!customerId,
  });
};

/**
 * Fetch single customer by UID
 */
export const useCustomerByUid = (uid: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: customerKeys.byUid(uid || ''),
    queryFn: async () => {
      if (!uid) throw new Error('UID is required');
      return await getUserByUid(uid);
    },
    enabled: options?.enabled !== false && !!uid,
  });
};

/**
 * Fetch single customer by email
 */
export const useCustomerByEmail = (email: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: customerKeys.byEmail(email || ''),
    queryFn: async () => {
      if (!email) throw new Error('Email is required');
      return await getUserByEmail(email);
    },
    enabled: options?.enabled !== false && !!email,
  });
};

/**
 * Update customer mutation
 */
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, updates }: { customerId: string; updates: Partial<User> }) => {
      await updateUser(customerId, updates);
      return { customerId, updates };
    },
    onSuccess: ({ customerId }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(customerId) });
    },
  });
};

/**
 * Update customer by UID mutation
 */
export const useUpdateCustomerByUid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, updates }: { uid: string; updates: Partial<User> }) => {
      await updateUserByUid(uid, updates);
      return { uid, updates };
    },
    onSuccess: ({ uid }) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.byUid(uid) });
    },
  });
};

/**
 * Delete customer mutation
 */
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      await deleteUser(customerId);
      return customerId;
    },
    onSuccess: (customerId) => {
      queryClient.removeQueries({ queryKey: customerKeys.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
    },
  });
};

