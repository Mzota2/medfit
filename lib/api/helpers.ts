/**
 * API helper functions for consistent responses
 */

import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types/common';
import { handleError } from '@/lib/utils/errors';

/**
 * Create success response
 */
export const successResponse = <T>(data: T, message?: string): NextResponse<ApiResponse<T>> => {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
};

/**
 * Create error response
 */
export const errorResponse = (
  error: unknown,
  defaultMessage: string = 'An error occurred'
): NextResponse<ApiResponse<null>> => {
  const { message, code, statusCode } = handleError(error);
  
  return NextResponse.json(
    {
      success: false,
      error: message || defaultMessage,
      message: message || defaultMessage,
    },
    { status: statusCode }
  );
};

/**
 * Get authenticated user from request
 * This extracts the Firebase Auth token from the Authorization header
 */
export const getAuthUser = async (request: Request): Promise<{ uid: string; email?: string } | null> => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Verify token with Firebase Admin SDK
    // This should be implemented with firebase-admin on the server
    // For now, return null (client-side auth will be handled differently)
    // In production, you'd use: admin.auth().verifyIdToken(token)
    
    return null; // Placeholder - implement with Firebase Admin SDK
  } catch (error) {
    return null;
  }
};

