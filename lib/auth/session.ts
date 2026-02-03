/**
 * Session management functions
 */

import { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserByUid } from '@/lib/users';
import { User, UserRole } from '@/types/user';
import { AuthenticationError } from '@/lib/utils/errors';

export interface SessionUser {
  firebaseUser: FirebaseUser;
  user: User;
}

/**
 * Get current session (Firebase Auth user + Firestore user document)
 */
export const getCurrentSession = async (): Promise<SessionUser | null> => {
  const firebaseUser = auth.currentUser;
  
  if (!firebaseUser) {
    return null;
  }

  const user = await getUserByUid(firebaseUser.uid);
  
  if (!user) {
    return null;
  }

  return {
    firebaseUser,
    user,
  };
};

/**
 * Get current user (Firestore document only)
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const firebaseUser = auth.currentUser;
  
  if (!firebaseUser) {
    return null;
  }

  return await getUserByUid(firebaseUser.uid);
};

/**
 * Require authentication - throws if not signed in
 */
export const requireAuth = async (): Promise<SessionUser> => {
  const session = await getCurrentSession();
  
  if (!session) {
    throw new AuthenticationError('Authentication required');
  }

  if (!session.user.isActive) {
    throw new AuthenticationError('Account is inactive');
  }

  return session;
};

/**
 * Require specific role
 */
export const requireRole = async (role: UserRole): Promise<SessionUser> => {
  const session = await requireAuth();
  
  if (session.user.role !== role) {
    throw new AuthenticationError(`Access denied. ${role} role required.`);
  }

  return session;
};

/**
 * Require admin or staff role
 */
export const requireAdminOrStaff = async (): Promise<SessionUser> => {
  const session = await requireAuth();
  
  if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.STAFF) {
    throw new AuthenticationError('Access denied. Admin or staff role required.');
  }

  return session;
};

/**
 * Check if user has specific role
 */
export const hasRole = async (role: UserRole): Promise<boolean> => {
  const user = await getCurrentUser();
  return user?.role === role;
};

/**
 * Check if user is admin or staff
 */
export const isAdminOrStaff = async (): Promise<boolean> => {
  const user = await getCurrentUser();
  return user?.role === UserRole.ADMIN || user?.role === UserRole.STAFF;
};

/**
 * Get user ID token (for API requests)
 */
export const getIdToken = async (forceRefresh: boolean = false): Promise<string | null> => {
  const user = auth.currentUser;
  
  if (!user) {
    return null;
  }

  try {
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error('Failed to get ID token:', error);
    return null;
  }
};

/**
 * Refresh user token
 */
export const refreshToken = async (): Promise<string | null> => {
  return getIdToken(true);
};

