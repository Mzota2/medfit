/**
 * React Query hooks for Admins/Staff (Users with role='admin' or 'staff')
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdmins, getStaff, getUserById, getUserByUid, getUserByEmail, updateUser, updateUserByUid, deleteUser } from '@/lib/users';
import { User } from '@/types/user';

/**
 * Query key factory for admins/staff
 */
export const adminsStaffKeys = {
  all: ['adminsStaff'] as const,
  lists: () => [...adminsStaffKeys.all, 'list'] as const,
  list: (filters?: { role?: 'admin' | 'staff' }) => [...adminsStaffKeys.lists(), filters] as const,
  admins: () => [...adminsStaffKeys.all, 'admins'] as const,
  staff: () => [...adminsStaffKeys.all, 'staff'] as const,
  details: () => [...adminsStaffKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminsStaffKeys.details(), id] as const,
  byUid: (uid: string) => [...adminsStaffKeys.all, 'uid', uid] as const,
  byEmail: (email: string) => [...adminsStaffKeys.all, 'email', email] as const,
};

/**
 * Fetch all admins
 */
export const useAdmins = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: adminsStaffKeys.admins(),
    queryFn: async () => {
      return await getAdmins();
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch all staff
 */
export const useStaff = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: adminsStaffKeys.staff(),
    queryFn: async () => {
      return await getStaff();
    },
    enabled: options?.enabled !== false,
  });
};

/**
 * Fetch all admins and staff
 */
export const useAdminsStaff = (options?: { enabled?: boolean }) => {
  const { data: admins = [], isLoading: adminsLoading } = useAdmins({ enabled: options?.enabled !== false });
  const { data: staff = [], isLoading: staffLoading } = useStaff({ enabled: options?.enabled !== false });
  
  return {
    data: [...admins, ...staff],
    isLoading: adminsLoading || staffLoading,
    error: null,
  };
};

/**
 * Fetch single user by ID
 */
export const useAdminStaffUser = (userId: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: adminsStaffKeys.detail(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      return await getUserById(userId);
    },
    enabled: options?.enabled !== false && !!userId,
  });
};

/**
 * Fetch single user by UID
 */
export const useAdminStaffUserByUid = (uid: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: adminsStaffKeys.byUid(uid || ''),
    queryFn: async () => {
      if (!uid) throw new Error('UID is required');
      return await getUserByUid(uid);
    },
    enabled: options?.enabled !== false && !!uid,
  });
};

/**
 * Fetch single user by email
 */
export const useAdminStaffUserByEmail = (email: string | undefined, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: adminsStaffKeys.byEmail(email || ''),
    queryFn: async () => {
      if (!email) throw new Error('Email is required');
      return await getUserByEmail(email);
    },
    enabled: options?.enabled !== false && !!email,
  });
};

/**
 * Update user mutation
 */
export const useUpdateAdminStaffUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      await updateUser(userId, updates);
      return { userId, updates };
    },
    onSuccess: ({ userId }) => {
      queryClient.invalidateQueries({ queryKey: adminsStaffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminsStaffKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: adminsStaffKeys.admins() });
      queryClient.invalidateQueries({ queryKey: adminsStaffKeys.staff() });
    },
  });
};

/**
 * Update user by UID mutation
 */
export const useUpdateAdminStaffUserByUid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ uid, updates }: { uid: string; updates: Partial<User> }) => {
      await updateUserByUid(uid, updates);
      return { uid, updates };
    },
    onSuccess: ({ uid }) => {
      queryClient.invalidateQueries({ queryKey: adminsStaffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminsStaffKeys.byUid(uid) });
      queryClient.invalidateQueries({ queryKey: adminsStaffKeys.admins() });
      queryClient.invalidateQueries({ queryKey: adminsStaffKeys.staff() });
    },
  });
};

/**
 * Delete user mutation
 */
export const useDeleteAdminStaffUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await deleteUser(userId);
      return userId;
    },
    onSuccess: (userId) => {
      queryClient.removeQueries({ queryKey: adminsStaffKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: adminsStaffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminsStaffKeys.admins() });
      queryClient.invalidateQueries({ queryKey: adminsStaffKeys.staff() });
    },
  });
};

