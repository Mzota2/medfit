/**
 * Two-Factor Authentication (2FA) utilities
 * Automatically enables 2FA for admin users
 */

import { User as FirebaseUser, multiFactor } from 'firebase/auth';
import { getUserRole } from '@/lib/firebase/auth';
import { UserRole } from '@/types/user';
import { getUserByUid, updateUserByUid } from '@/lib/users';

/**
 * Check if user has 2FA enabled
 */
export async function has2FAEnabled(user: FirebaseUser): Promise<boolean> {
  try {
    const enrolledFactors = multiFactor(user).enrolledFactors;
    return enrolledFactors.length > 0;
  } catch (error) {
    console.error('Error checking 2FA status:', error);
    return false;
  }
}

/**
 * Check if 2FA is required for user (admins only)
 */
export async function is2FARequired(user: FirebaseUser): Promise<boolean> {
  try {
    const role = await getUserRole(user);
    // Only admins and staff require 2FA
    return role === UserRole.ADMIN || role === UserRole.STAFF;
  } catch (error) {
    console.error('Error checking if 2FA is required:', error);
    return false;
  }
}

/**
 * Automatically enable 2FA for admin users
 * This should be called after user signs up or when role changes to admin
 */
export async function enable2FAForAdmin(user: FirebaseUser): Promise<void> {
  try {
    const role = await getUserRole(user);
    
    // Only enable for admins and staff
    if (role !== UserRole.ADMIN && role !== UserRole.STAFF) {
      return;
    }

    // Check if already enrolled
    const has2FA = await has2FAEnabled(user);
    if (has2FA) {
      return; // Already has 2FA
    }

    // Update user document to indicate 2FA should be set up
    await updateUserByUid(user.uid, {
      requires2FASetup: true,
    });

    // Note: Actual 2FA enrollment must be done by the user through the UI
    // This just marks that they need to set it up
  } catch (error) {
    console.error('Error enabling 2FA for admin:', error);
    // Don't throw - this is not critical for login
  }
}

/**
 * Verify 2FA requirement before allowing login
 */
export async function verify2FARequirement(user: FirebaseUser): Promise<{
  requires2FA: boolean;
  has2FA: boolean;
  needsSetup: boolean;
}> {
  const requires2FA = await is2FARequired(user);
  const has2FA = await has2FAEnabled(user);
  
  // Get user document to check if setup is needed
  const userDoc = await getUserByUid(user.uid);
  const needsSetup = userDoc?.requires2FASetup === true;

  return {
    requires2FA,
    has2FA,
    needsSetup,
  };
}

