/**
 * Sign up functions
 */

import { 
  createUserWithEmailAndPassword, 
  deleteUser, 
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { createUser, getUserByUid } from '@/lib/users';
import { UserRole, CreateUserInput, User } from '@/types/user';
import { ValidationError } from '@/lib/utils/errors';
import { sendVerificationEmail } from './verification';
import { extractNameFromDisplayName, combineNameToDisplayName } from '@/lib/utils/nameExtraction';
// 2FA disabled - requires paid Firebase tier
// import { enable2FAForAdmin } from '@/lib/security/2fa';

export interface SignUpInput {
  email: string;
  password: string;
  firstName?: string; // Required on frontend, optional on backend for Google signup
  lastName?: string; // Required on frontend, optional on backend for Google signup
  displayName?: string; // Optional, used for Google signup
  phone?: string;
  role?: UserRole;
}

export interface SignUpResult {
  firebaseUser: FirebaseUser;
  user: User;
  emailSent: boolean;
}

/**
 * Sign up with email and password
 * Creates Firebase Auth user and Firestore user document
 */
export const signUp = async (input: SignUpInput): Promise<SignUpResult> => {
  if (!input.email || !input.password) {
    throw new ValidationError('Email and password are required');
  }

  if (input.password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  // Create Firebase Auth user
  let userCredential: UserCredential;
  try {
    userCredential = await createUserWithEmailAndPassword(
      auth,
      input.email,
      input.password
    );
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/email-already-in-use') {
        throw new ValidationError('Email is already registered');
      }
      if (error.code === 'auth/invalid-email') {
        throw new ValidationError('Invalid email address');
      }
      if (error.code === 'auth/weak-password') {
        throw new ValidationError('Password is too weak');
      }
    }
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Failed to create account';
    throw new ValidationError('Failed to create account');
  }

  const firebaseUser = userCredential.user;

  // Extract firstName and lastName from input or displayName
  let firstName = input.firstName;
  let lastName = input.lastName;
  let displayName = input.displayName || firebaseUser.displayName || undefined;
  
  // If firstName/lastName not provided but displayName is, extract from displayName
  if ((!firstName || !lastName) && displayName) {
    const extracted = extractNameFromDisplayName(displayName);
    firstName = firstName || extracted.firstName;
    lastName = lastName || extracted.lastName;
  }
  
  // If we have firstName and lastName but no displayName, combine them
  if ((firstName || lastName) && !displayName) {
    displayName = combineNameToDisplayName(firstName, lastName);
  }

  // Create user document in Firestore
  let user: User;
  try {
    const userInput: CreateUserInput = {
      uid: firebaseUser.uid,
      email: firebaseUser.email!,
      firstName,
      lastName,
      displayName,
      phone: input.phone,
      role: input.role || UserRole.CUSTOMER,
    };

    await createUser(userInput);
    const createdUser = await getUserByUid(firebaseUser.uid);
    
    if (!createdUser) {
      throw new Error('Failed to retrieve created user');
    }
    
    user = createdUser;
  } catch (error: unknown) {
    //delete the firebase user
    await deleteUser(firebaseUser);
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'Unknown error';
    throw new ValidationError('Failed to create user profile: ' + message);
  }

  // Send email verification
  let emailSent = false;
  try {
    if (firebaseUser.email) {
      await sendVerificationEmail(firebaseUser);
      emailSent = true;
    }
  } catch (error) {
    // Don't fail signup if email verification fails
    console.error('Failed to send verification email:', error);
  }

  // 2FA disabled - requires paid Firebase tier
  // 2FA enablement removed to stay on free tier

  return {
    firebaseUser,
    user,
    emailSent,
  };
};



