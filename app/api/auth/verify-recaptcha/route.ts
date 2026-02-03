/**
 * API route for verifying reCAPTCHA token
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyRecaptcha } from '@/lib/security/recaptcha';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'reCAPTCHA token is required' },
        { status: 400 }
      );
    }

    const result = await verifyRecaptcha(token);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message || 'reCAPTCHA verification failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

