/**
 * Email verification functions
 */

import { 
  sendEmailVerification,
  applyActionCode,
  User as FirebaseUser,
  AuthError
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserByUid, updateUser } from '@/lib/users';
import { AuthenticationError, ValidationError } from '@/lib/utils/errors';

/**
 * Get the app's base URL for action links
 * Uses NEXT_PUBLIC_APP_URL if set, otherwise uses current origin
 */
const getAppBaseUrl = (): string => {
  // In browser, always use current origin for accurate URL
  if (typeof window !== 'undefined') {
    // Prefer environment variable if set (for production)
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL;
    }
    // Use current origin (works for both localhost and production)
    return window.location.origin;
  }
  
  // Server-side: use environment variable or default
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  return 'http://localhost:3000';
};

/**
 * Send email verification
 */
export const sendVerificationEmail = async (user?: FirebaseUser): Promise<void> => {
  const currentUser = user || auth.currentUser;
  
  if (!currentUser) {
    throw new AuthenticationError('No user signed in');
  }

  if (currentUser.emailVerified) {
    throw new ValidationError('Email is already verified');
  }

  try {
    // Get the app's base URL
    const appBaseUrl = getAppBaseUrl();
    const continueUrl = `${appBaseUrl}/verify`;
    
    // Configure action code settings to use custom URL
    // Firebase will append oobCode and mode query parameters automatically
    // Note: handleCodeInApp is for mobile apps, not web - omit it for web apps
    const actionCodeSettings = {
      url: continueUrl,
      // Only set handleCodeInApp for mobile apps, not for web
      // For web apps, Firebase will use the url directly
    };
    
    console.log('Sending verification email with URL:', continueUrl);
    await sendEmailVerification(currentUser, actionCodeSettings);
  } catch (error: unknown) {
    const authError = error as AuthError;
    if (authError.code === 'auth/too-many-requests') {
      throw new ValidationError('Too many verification emails sent. Please wait before requesting another.');
    }
    throw new ValidationError('Failed to send verification email');
  }
};

/**
 * Verify email with action code (from email link)
 */
export const verifyEmail = async (oobCode: string): Promise<void> => {
  if (!oobCode) {
    throw new ValidationError('Verification code is required');
  }

  try {
    await applyActionCode(auth, oobCode);
    
    // Update user document to mark email as verified
    const currentUser = auth.currentUser;
    if (currentUser) {
      const user = await getUserByUid(currentUser.uid);
      if (user?.id) {
        await updateUser(user.id, {
          emailVerified: true,
        });
      }
    }
  } catch (error: unknown) {
    const authError = error as AuthError;
    if (authError.code === 'auth/invalid-action-code') {
      throw new ValidationError('Invalid or expired verification link');
    }
    if (authError.code === 'auth/expired-action-code') {
      throw new ValidationError('Verification link has expired. Please request a new one.');
    }
    throw new ValidationError(authError.message || 'Failed to verify email');
  }
};

/**
 * Check if current user's email is verified
 */
export const isEmailVerified = (): boolean => {
  const user = auth.currentUser;
  return user?.emailVerified || false;
};

/**
 * Reload user to refresh email verification status
 */
export const reloadUser = async (): Promise<FirebaseUser> => {
  const user = auth.currentUser;
  
  if (!user) {
    throw new AuthenticationError('No user signed in');
  }

  try {
    await user.reload();
    return user;
  } catch (error: unknown) {
    const authError = error as AuthError;
    throw new AuthenticationError(authError.message || 'Failed to reload user');
  }
};

