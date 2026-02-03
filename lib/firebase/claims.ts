/**
 * Firebase Auth custom claims helpers
 * 
 * Note: Setting custom claims must be done server-side via Cloud Functions
 * This file provides helper functions for reading claims client-side
 * and documentation for server-side claim setting
 */

import { User } from 'firebase/auth';
import { getUserRole } from './auth';
import { UserRole} from '@/types/user';

/**
 * Get user's custom claims (client-side)
 */
// export const getCustomClaims = async (user: User): Promise<CustomClaims | null> => {
//   return getUserClaims(user);
// };

/**
 * Get user's role from claims
 */
export const getRoleFromClaims = async (user: User): Promise<UserRole | null> => {
  return getUserRole(user);
};

/**
 * SERVER-SIDE ONLY: Set custom claims
 * 
 * This must be implemented in Cloud Functions:
 * 
 * ```typescript
 * import * as admin from 'firebase-admin';
 * 
 * export const setUserRole = functions.https.onCall(async (data, context) => {
 *   // Verify admin making the request
 *   if (!context.auth || !isAdmin(context.auth.uid)) {
 *     throw new functions.https.HttpsError('permission-denied', 'Only admins can set roles');
 *   }
 * 
 *   const { uid, role } = data;
 *   await admin.auth().setCustomUserClaims(uid, { role });
 *   
 *   return { success: true };
 * });
 * ```
 */

