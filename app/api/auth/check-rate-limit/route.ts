/**
 * API route for checking login rate limits
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAccountLocked, getRemainingAttempts } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const lockStatus = await isAccountLocked(email);
    const remainingAttempts = await getRemainingAttempts(email);

    return NextResponse.json({
      locked: lockStatus.locked,
      message: lockStatus.message,
      remainingAttempts,
    });
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

