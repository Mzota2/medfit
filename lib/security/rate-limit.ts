/**
 * Login rate limiting utilities
 * Tracks failed login attempts and locks accounts after max attempts
 */

import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface LoginAttempt {
  email: string;
  attempts: number;
  lastAttemptAt: Date | Timestamp;
  lockedUntil?: Date | Timestamp;
  isLocked: boolean;
}

const MAX_LOGIN_ATTEMPTS = 5; // Maximum failed attempts before lockout
const LOCKOUT_DURATION_MINUTES = 15; // Lockout duration in minutes

/**
 * Get login attempt record for an email
 */
export async function getLoginAttempts(email: string): Promise<LoginAttempt | null> {
  try {
    // Store login attempts in a separate collection for better organization
    const attemptRef = doc(db, 'login_attempts', email.toLowerCase());
    const attemptDoc = await getDoc(attemptRef);
    
    if (!attemptDoc.exists()) {
      return null;
    }

    const data = attemptDoc.data();
    return {
      email: data.email,
      attempts: data.attempts || 0,
      lastAttemptAt: data.lastAttemptAt?.toDate() || new Date(),
      lockedUntil: data.lockedUntil?.toDate(),
      isLocked: data.isLocked || false,
    };
  } catch (error) {
    console.error('Error getting login attempts:', error);
    return null;
  }
}

/**
 * Record a failed login attempt
 */
export async function recordFailedAttempt(email: string): Promise<LoginAttempt> {
  try {
    const normalizedEmail = email.toLowerCase();
    const attemptRef = doc(db, 'login_attempts', normalizedEmail);
    
    const existing = await getLoginAttempts(email);
    const currentAttempts = existing ? existing.attempts + 1 : 1;
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    const isLocked = currentAttempts >= MAX_LOGIN_ATTEMPTS;

    const attemptData: LoginAttempt = {
      email: normalizedEmail,
      attempts: currentAttempts,
      lastAttemptAt: now,
      lockedUntil: isLocked ? lockedUntil : undefined,
      isLocked,
    };

    await setDoc(attemptRef, {
      ...attemptData,
      lastAttemptAt: serverTimestamp(),
      lockedUntil: isLocked ? Timestamp.fromDate(lockedUntil) : null,
    }, { merge: true });

    return attemptData;
  } catch (error) {
    // Log technical error but don't throw - rate limiting is non-critical
    console.error('Error recording failed login attempt:', error);
    // Return a safe default to prevent breaking the login flow
    return {
      email: email.toLowerCase(),
      attempts: 1,
      lastAttemptAt: new Date(),
      isLocked: false,
    };
  }
}

/**
 * Reset login attempts after successful login
 */
export async function resetLoginAttempts(email: string): Promise<void> {
  try {
    const normalizedEmail = email.toLowerCase();
    const attemptRef = doc(db, 'login_attempts', normalizedEmail);
    
    // Check if document exists first to avoid "document not found" errors
    const attemptDoc = await getDoc(attemptRef);
    
    if (attemptDoc.exists()) {
      // Document exists, update it
      await updateDoc(attemptRef, {
        attempts: 0,
        isLocked: false,
        lockedUntil: null,
        lastAttemptAt: serverTimestamp(),
      });
    }
    // If document doesn't exist, there's nothing to reset - this is fine
    // No need to create a document for successful logins
  } catch (error) {
    // Log technical error but don't throw - resetting attempts is non-critical
    // Don't block successful login if reset fails
    console.error('Error resetting login attempts:', error);
  }
}

/**
 * Check if account is locked
 */
export async function isAccountLocked(email: string): Promise<{ locked: boolean; message?: string }> {
  try {
    const attempts = await getLoginAttempts(email);
    
    if (!attempts) {
      return { locked: false };
    }

    // Check if lockout period has expired
    if (attempts.isLocked && attempts.lockedUntil) {
      const now = new Date();
      const lockedUntil = attempts.lockedUntil instanceof Date 
        ? attempts.lockedUntil 
        : attempts.lockedUntil.toDate();
      
      if (now < lockedUntil) {
        const minutesRemaining = Math.ceil((lockedUntil.getTime() - now.getTime()) / (60 * 1000));
        return {
          locked: true,
          message: `Account locked due to too many failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
        };
      } else {
        // Lockout expired, reset (non-blocking)
        await resetLoginAttempts(email);
        return { locked: false };
      }
    }

    return { locked: attempts.isLocked || false };
  } catch (error) {
    // Log technical error but don't block login - fail open for better UX
    console.error('Error checking account lock status:', error);
    return { locked: false };
  }
}

/**
 * Get remaining attempts before lockout
 */
export async function getRemainingAttempts(email: string): Promise<number> {
  try {
    const attempts = await getLoginAttempts(email);
    if (!attempts) {
      return MAX_LOGIN_ATTEMPTS;
    }
    return Math.max(0, MAX_LOGIN_ATTEMPTS - attempts.attempts);
  } catch (error) {
    // Log technical error but return max attempts (fail open)
    console.error('Error getting remaining attempts:', error);
    return MAX_LOGIN_ATTEMPTS;
  }
}

