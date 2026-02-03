/**
 * User profile management functions
 */

import { 
  updateProfile,
  updateEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserByUid, updateUser } from '@/lib/users';
import { User } from '@/types/user';
import { ValidationError, AuthenticationError } from '@/lib/utils/errors';

/**
 * Update user profile (display name, photo URL)
 */
export const updateUserProfile = async (
  updates: {
    displayName?: string;
    photoURL?: string;
  },
  user?: FirebaseUser
): Promise<User> => {
  const currentUser = user || auth.currentUser;
  
  if (!currentUser) {
    throw new AuthenticationError('No user signed in');
  }

  try {
    // Update Firebase Auth profile
    await updateProfile(currentUser, {
      displayName: updates.displayName,
      photoURL: updates.photoURL,
    });

    // Update Firestore user document
    const firestoreUser = await getUserByUid(currentUser.uid);
    if (!firestoreUser?.id) {
      throw new Error('User document not found');
    }

    await updateUser(firestoreUser.id, {
      displayName: updates.displayName,
      photoURL: updates.photoURL,
    });

    // Reload to get updated user
    const updatedUser = await getUserByUid(currentUser.uid);
    if (!updatedUser) {
      throw new Error('Failed to retrieve updated user');
    }

    return updatedUser;
  } catch (error: unknown) {
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Failed to update profile';
    throw new ValidationError('Failed to update profile');
  }
};

/**
 * Update user email
 * Requires reauthentication for security
 */
export const updateUserEmail = async (
  newEmail: string,
  password: string,
  user?: FirebaseUser
): Promise<void> => {
  const currentUser = user || auth.currentUser;
  
  if (!currentUser || !currentUser.email) {
    throw new AuthenticationError('No user signed in');
  }

  if (!newEmail || !password) {
    throw new ValidationError('New email and current password are required');
  }

  try {
    // Reauthenticate
    const { reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);

    // Update email
    await updateEmail(currentUser, newEmail);

    // Update Firestore user document
    const firestoreUser = await getUserByUid(currentUser.uid);
    if (firestoreUser?.id) {
      await updateUser(firestoreUser.id, {
        email: newEmail,
        emailVerified: false, // Email needs to be verified again
      });
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/email-already-in-use') {
        throw new ValidationError('Email is already in use');
      }
      if (error.code === 'auth/invalid-email') {
        throw new ValidationError('Invalid email address');
      }
      if (error.code === 'auth/wrong-password') {
        throw new ValidationError('Incorrect password');
      }
      if (error.code === 'auth/requires-recent-login') {
        throw new AuthenticationError('Please sign in again before changing your email');
      }
    }
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Failed to update email';
    throw new ValidationError('Failed to update email');
  }
};

/**
 * Update user phone number (stored in Firestore)
 */
export const updateUserPhone = async (
  phone: string,
  user?: FirebaseUser
): Promise<User> => {
  const currentUser = user || auth.currentUser;
  
  if (!currentUser) {
    throw new AuthenticationError('No user signed in');
  }

  const firestoreUser = await getUserByUid(currentUser.uid);
  if (!firestoreUser?.id) {
    throw new Error('User document not found');
  }

  await updateUser(firestoreUser.id, {
    phone,
  });

  const updatedUser = await getUserByUid(currentUser.uid);
  if (!updatedUser) {
    throw new Error('Failed to retrieve updated user');
  }

  return updatedUser;
};

/**
 * Delete user account
 * Note: This should be done server-side with Firebase Admin SDK for security
 * This function marks the account as inactive in Firestore
 */
// export const deleteAccount = async (
//   password: string,
//   user?: FirebaseUser
// ): Promise<void> => {
//   const currentUser = user || auth.currentUser;
  
//   if (!currentUser || !currentUser.email) {
//     throw new AuthenticationError('No user signed in');
//   }

//   try {
//     // Reauthenticate
//     const { reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
//     const credential = EmailAuthProvider.credential(currentUser.email, password);
//     await reauthenticateWithCredential(currentUser, credential);

//     // Soft delete in Firestore
//     const firestoreUser = await getUserByUid(currentUser.uid);
//     if (firestoreUser?.id) {
//       await updateUser(firestoreUser.id, {
//         isActive: false,
//       });
//     }

//     // Note: Actual Firebase Auth user deletion should be done server-side
//     // via Firebase Admin SDK for security reasons
//   } catch (error: unknown) {
//     if (error && typeof error === 'object' && 'code' in error) {
//       if (error.code === 'auth/wrong-password') {
//         throw new ValidationError('Incorrect password');
//       }
//       if (error.code === 'auth/requires-recent-login') {
//         throw new AuthenticationError('Please sign in again before deleting your account');
//       }
//     }
//     const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
//       ? error.message
//       : 'Failed to delete account';
//     throw new ValidationError(message);
//   }
// };

