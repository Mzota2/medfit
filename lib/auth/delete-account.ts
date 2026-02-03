/**
 * Delete account functions
 */

import { deleteUser as firebaseDeleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/types/collections';
import { getUserByUid } from '@/lib/users';
import { UserRole } from '@/types/user';
import { AuthenticationError, ValidationError } from '@/lib/utils/errors';

export interface DeleteAccountInput {
  password: string;
}

/**
 * Delete user account
 * Deletes both Firebase Auth user and Firestore user document
 * Only allows deletion for customer accounts
 */
export const deleteAccount = async (input: DeleteAccountInput): Promise<void> => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    throw new AuthenticationError('No user is currently signed in');
  }

  if (!currentUser.email) {
    throw new ValidationError('User email is required for account deletion');
  }

  // Get user document to check role
  const userDoc = await getUserByUid(currentUser.uid);
  
  if (!userDoc) {
    throw new ValidationError('User profile not found');
  }

  // Only allow customers to delete their accounts
  if (userDoc.role !== UserRole.CUSTOMER) {
    throw new ValidationError('Only customer accounts can be deleted. Please contact support for admin/staff accounts.');
  }

  // Re-authenticate user before deletion (security requirement)
  try {
    const credential = EmailAuthProvider.credential(currentUser.email, input.password);
    await reauthenticateWithCredential(currentUser, credential);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/wrong-password') {
        throw new AuthenticationError('Incorrect password');
      }
      if (error.code === 'auth/invalid-credential') {
        throw new AuthenticationError('Invalid credentials');
      }
    }
    throw new AuthenticationError('Re-authentication failed. Please check your password.');
  }

  // Delete Firestore user document first
  if (userDoc.id) {
    try {
      const userRef = doc(db, COLLECTIONS.USERS, userDoc.id);
      await deleteDoc(userRef);
    } catch (error) {
      console.error('Error deleting user document:', error);
      // Continue with Firebase Auth deletion even if Firestore deletion fails
      // This ensures the user can't log in even if Firestore document persists
    }
  }

  // Delete Firebase Auth user (this will also sign out the user)
  try {
    await firebaseDeleteUser(currentUser);
  } catch (error: unknown) {
    console.error('Error deleting Firebase Auth user:', error);
    throw new AuthenticationError('Failed to delete account. Please try again or contact support.');
  }
};

