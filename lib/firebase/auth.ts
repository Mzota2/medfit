/**
 * Firebase Auth helpers and custom claims handling
 */

import { User as FirebaseUser } from 'firebase/auth';
import { auth } from './config';
import { UserRole } from '@/types/user';
import { getUserByUid } from '@/lib/users';

/**
 * Get current authenticated user (Firebase User)
 * Note: For Firestore user document, use getCurrentUser from @/lib/auth/session
 */
export const getCurrentFirebaseUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * Get user's role from Firestore user document
 * Takes Firebase User and fetches role from Firestore
 */
export const getUserRole = async (firebaseUser: FirebaseUser): Promise<UserRole | null> => {
  try {
    const user = await getUserByUid(firebaseUser.uid);
    return user?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

/**
 * Check if user is admin or staff
 */
export const isAdminOrStaff = async (firebaseUser: FirebaseUser): Promise<boolean> => {
  const userRole = await getUserRole(firebaseUser);
  return userRole === UserRole.ADMIN || userRole === UserRole.STAFF;
};

/**
 * Check if user is super admin
 */
export const isSuperAdmin = async (firebaseUser: FirebaseUser): Promise<boolean> => {
  const userRole = await getUserRole(firebaseUser);
  return userRole === UserRole.SUPER_ADMIN;
};

