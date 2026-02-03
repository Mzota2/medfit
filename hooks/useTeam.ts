/**
 * React Query hook for fetching team members (admins and staff)
 */

import { useQuery } from '@tanstack/react-query';
import { getAdmins, getStaff } from '@/lib/users';
import { User, UserRole } from '@/types/user';

/**
 * Query key factory for team
 */
export const teamKeys = {
  all: ['team'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: () => [...teamKeys.lists()] as const,
};

/**
 * Fetch team members (admins and staff)
 * Returns admins first, then staff
 */
export const useTeam = (options?: {
  enabled?: boolean;
  businessId?: string;
}) => {
  return useQuery({
    queryKey: [...teamKeys.list(), options?.businessId],
    queryFn: async () => {
      const [admins, staff] = await Promise.all([
        getAdmins(options?.businessId),
        getStaff(options?.businessId),
      ]);

      // Filter active users only
      const filteredAdmins = admins.filter(admin => admin.isActive !== false);
      const filteredStaff = staff.filter(staffMember => staffMember.isActive !== false);

      // Combine: admins first, then staff
      const team: User[] = [...filteredAdmins, ...filteredStaff];

      return team;
    },
    enabled: options?.enabled !== false,
  });
};

