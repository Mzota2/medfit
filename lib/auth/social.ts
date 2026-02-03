/**
 * Social authentication functions
 */

import { 
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserByUid, updateUserByUid } from '@/lib/users';
import { UserRole, User } from '@/types/user';
import { AuthenticationError } from '@/lib/utils/errors';
import { extractNameFromDisplayName } from '@/lib/utils/nameExtraction';
export type SocialProvider = 'google' | 'facebook' | 'twitter' | 'apple';

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<{ firebaseUser: FirebaseUser; user: User }> => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;

    // Check if user document exists, create if not
    let user = await getUserByUid(firebaseUser.uid);
    
    if (!user) {
      // Extract firstName and lastName from displayName
      const displayName = firebaseUser.displayName || undefined;
      const { firstName, lastName } = extractNameFromDisplayName(displayName);
      
      // Create user document
      const { createUser } = await import('@/lib/users');
      await createUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        firstName,
        lastName,
        displayName,
        photoURL: firebaseUser.photoURL || undefined,
        emailVerified: true,
        role: UserRole.CUSTOMER,
        
      }, );
      const createdUser = await getUserByUid(firebaseUser.uid);
      
      if (!createdUser) {
        throw new Error('Failed to create user profile');
      }
      user = createdUser;
    } else {
      // Update existing user if they don't have firstName/lastName but have displayName
      if ((!user.firstName || !user.lastName) && firebaseUser.displayName) {
        const { firstName, lastName } = extractNameFromDisplayName(firebaseUser.displayName);
        if (firstName || lastName) {
          await updateUserByUid(firebaseUser.uid, {
            firstName: user.firstName || firstName,
            lastName: user.lastName || lastName,
            displayName: user.displayName || firebaseUser.displayName,
          });
          const updatedUser = await getUserByUid(firebaseUser.uid);
          if (updatedUser) {
            user = updatedUser;
          }
        }
      }
    }

    if (!user) {
      throw new Error('Failed to retrieve user');
    }

    return { firebaseUser, user };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/popup-closed-by-user') {
        throw new AuthenticationError('Sign in was cancelled');
      }
      if (error.code === 'auth/popup-blocked') {
        throw new AuthenticationError('Popup was blocked. Please allow popups for this site.');
      }
    }
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Failed to sign in with Google';
    throw new AuthenticationError('Failed to sign in with Google');
  }
};


