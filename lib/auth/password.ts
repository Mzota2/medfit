/**
 * Password management functions
 */

import { 
  sendPasswordResetEmail,
  confirmPasswordReset,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser,
  verifyPasswordResetCode
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { ValidationError, AuthenticationError } from '@/lib/utils/errors';

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email: string): Promise<void> => {
  if (!email) {
    throw new ValidationError('Email is required');
  }

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/user-not-found') {
        // Don't reveal if user exists for security
        // Still return success to prevent email enumeration
        return;
      }
      if (error.code === 'auth/too-many-requests') {
        throw new ValidationError('Too many requests. Please wait before trying again.');
      }
    }
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Failed to send password reset email';
    throw new ValidationError('Failed to send password reset email');
  }
};

/**
 * Reset password with action code (from email link)
 */
export const resetPassword = async (oobCode: string, newPassword: string): Promise<void> => {
  if (!oobCode || !newPassword) {
    throw new ValidationError('Reset code and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  try {
    // Reset the password (confirmPasswordReset also verifies the code)
    await confirmPasswordReset(auth, oobCode, newPassword);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/invalid-action-code') {
        throw new ValidationError('Invalid or expired reset link');
      }
      if (error.code === 'auth/expired-action-code') {
        throw new ValidationError('Reset link has expired. Please request a new one.');
      }
      if (error.code === 'auth/weak-password') {
        throw new ValidationError('Password is too weak');
      }
    }
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Failed to reset password';
    throw new ValidationError('Failed to reset password');
  }
};

/**
 * Change password (requires reauthentication)
 */
export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  user?: FirebaseUser
): Promise<void> => {
  const currentUser = user || auth.currentUser;
  
  if (!currentUser || !currentUser.email) {
    throw new AuthenticationError('No user signed in');
  }

  if (newPassword.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  try {
    // Reauthenticate user
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );
    await reauthenticateWithCredential(currentUser, credential);

    // Update password
    await updatePassword(currentUser, newPassword);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/wrong-password') {
        throw new ValidationError('Current password is incorrect');
      }
      if (error.code === 'auth/weak-password') {
        throw new ValidationError('New password is too weak');
      }
      if (error.code === 'auth/requires-recent-login') {
        throw new AuthenticationError('Please sign in again before changing your password');
      }
    }
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Failed to change password';
    throw new ValidationError('Failed to change password');
  }
};

/**
 * Verify password reset code (check if code is valid without resetting)
 */
export const verifyResetCode = async (oobCode: string): Promise<string> => {
  if (!oobCode) {
    throw new ValidationError('Reset code is required');
  }

  const email = await verifyPasswordResetCode(auth, oobCode);
  return email;
};

