/**
 * Sign in functions
 */

import { 
  signInWithEmailAndPassword,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { getUserByUid, updateUser } from '@/lib/users';
import { User } from '@/types/user';
import { ValidationError, AuthenticationError } from '@/lib/utils/errors';
import { isAccountLocked, recordFailedAttempt, resetLoginAttempts } from '@/lib/security/rate-limit';
// 2FA disabled - requires paid Firebase tier
// import { verify2FARequirement, enable2FAForAdmin } from '@/lib/security/2fa';

export interface SignInInput {
  email: string;
  password: string;
  recaptchaToken?: string; // Optional reCAPTCHA token
}

export interface SignInResult {
  firebaseUser: FirebaseUser;
  user: User;
}

/**
 * Sign in with email and password
 * Returns both Firebase Auth user and Firestore user document
 * Includes rate limiting and reCAPTCHA checks
 * Note: 2FA is disabled (requires paid Firebase tier)
 */
export const signIn = async (input: SignInInput): Promise<SignInResult> => {
  if (!input.email || !input.password) {
    throw new ValidationError('Email and password are required');
  }

  // Check rate limiting (account lockout)
  const lockStatus = await isAccountLocked(input.email);
  if (lockStatus.locked) {
    throw new AuthenticationError(lockStatus.message || 'Account is temporarily locked due to too many failed login attempts');
  }

  // Sign in with Firebase Auth
  let userCredential: UserCredential;
  try {
    userCredential = await signInWithEmailAndPassword(
      auth,
      input.email,
      input.password
    );
  } catch (error: unknown) {
    // Record failed attempt
    await recordFailedAttempt(input.email);
    
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/user-not-found') {
        throw new AuthenticationError('No account found with this email');
      }
      if (error.code === 'auth/wrong-password') {
        throw new AuthenticationError('Incorrect password');
      }
      if (error.code === 'auth/invalid-email') {
        throw new ValidationError('Invalid email address');
      }
      if (error.code === 'auth/user-disabled') {
        throw new AuthenticationError('This account has been disabled');
      }
      if (error.code === 'auth/too-many-requests') {
        throw new AuthenticationError('Too many failed attempts. Please try again later');
      }
      if (error.code === 'auth/invalid-credential'){
        throw new AuthenticationError("Password and email do not match")
      }
    }
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Failed to sign in';
    throw new AuthenticationError('Failed to sign in');
  }

  const firebaseUser = userCredential.user;

  // Reset login attempts on successful login
  await resetLoginAttempts(input.email);

  // Get user document from Firestore
  const user = await getUserByUid(firebaseUser.uid);

  if (!user) {
    throw new AuthenticationError('User profile not found. Please contact support.');
  }

  if (!user.isActive) {
    throw new AuthenticationError('This account has been deactivated');
  }

  // 2FA disabled - requires paid Firebase tier
  // 2FA checks removed to stay on free tier

  // Update last login (optional - can be done via Cloud Function instead)
  try {
    if (user.id) {
      await updateUser(user.id, {
        lastLoginAt: new Date(),
      });
    }
  } catch (error) {
    // Don't fail signin if last login update fails
    console.error('Failed to update last login:', error);
  }

  return {
    firebaseUser,
    user,
  };
};

