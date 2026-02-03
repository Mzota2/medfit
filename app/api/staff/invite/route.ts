/**
 * API route for sending staff invitation emails
 * SERVER-SIDE ONLY
 */

import { NextRequest } from 'next/server';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { createUser } from '@/lib/users';
import { UserRole } from '@/types/user';
import { successResponse, errorResponse } from '@/lib/api/helpers';
import { ValidationError } from '@/lib/utils/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firstName, lastName, role, businessId } = body;

    // Validate input
    if (!email || !firstName || !lastName || !role) {
      return errorResponse(
        new ValidationError('Email, firstName, lastName, and role are required'),
        'Missing required fields'
      );
    }

    // Validate role
    if (!['admin', 'staff'].includes(role)) {
      return errorResponse(
        new ValidationError('Role must be either "admin" or "staff"'),
        'Invalid role'
      );
    }

    // Automatically get businessId if not provided
    let finalBusinessId = businessId;
    if (!finalBusinessId) {
      const { getBusinessId } = await import('@/lib/businesses/utils');
      finalBusinessId = await getBusinessId();
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + '!@#';

    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
    const uid = userCredential.user.uid;

    // Create user document in Firestore
    await createUser(
      {
        uid,
        email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`, // Set displayName from firstName and lastName for backwards compatibility
        role: role as UserRole,
      },
      finalBusinessId
    );

    // Send password reset email (Firebase will send an email with a link to set password)
    // This is better than sending the password directly
    await sendPasswordResetEmail(auth, email);

    // TODO: Send a custom invitation email with welcome message
    // This would typically use a service like SendGrid, Resend, or similar
    // For now, Firebase's password reset email will be sent

    return successResponse(
      {
        userId: uid,
        email,
        message: 'Staff member created and invitation email sent. They will receive a password reset link to set their password.',
      },
      'Staff invitation sent successfully'
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send staff invitation';
    
    // Handle Firebase Auth errors
    if (errorMessage.includes('email-already-in-use')) {
      return errorResponse(
        new Error('A user with this email already exists'),
        'Email already in use'
      );
    }

    return errorResponse(
      error instanceof Error ? error : new Error(errorMessage),
      'Failed to send staff invitation'
    );
  }
}

