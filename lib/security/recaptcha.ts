/**
 * reCAPTCHA utilities for server-side verification
 */

import 'server-only';



const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

/**
 * Check if reCAPTCHA is properly configured
 */
export function isRecaptchaConfigured(): boolean {
  return !!RECAPTCHA_SECRET_KEY && RECAPTCHA_SECRET_KEY.length > 0;
}

/**
 * Verify reCAPTCHA token on server-side
 * @returns Object with success status and optional message
 */
export async function verifyRecaptcha(token: string): Promise<{ success: boolean; message?: string }> {
  // In production, always require a token
  if (process.env.NODE_ENV === 'production' && !token) {
    console.warn('reCAPTCHA token is required in production');
    return { success: false, message: 'Security verification failed' };
  }

  // Check if reCAPTCHA is configured
  if (!isRecaptchaConfigured()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('reCAPTCHA not properly configured. Using development bypass.');
      return { success: true };
    }
    console.error('reCAPTCHA is not properly configured in production');
    return { 
      success: false,
      message: 'Security service is not available. Please try again later.'
    };
  }

  // If we're in development and it's a test token, allow it
  if (process.env.NODE_ENV !== 'production' && token === 'dev-token') {
    return { success: true };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${encodeURIComponent(RECAPTCHA_SECRET_KEY || '')}&response=${encodeURIComponent(token)}`,
    });

    const data = await response.json();
    
    // Check if reCAPTCHA verification was successful
    if (!data.success) {
      console.error('reCAPTCHA verification failed:', data['error-codes']?.join(', ') || 'Unknown error');
      return { 
        success: false, 
        message: 'Security verification failed. Please try again.' 
      };
    }

    // Optional: Check the score if using reCAPTCHA v3
    if (data.score !== undefined && data.score < 0.5) { // Adjust threshold as needed
      console.warn(`reCAPTCHA score too low: ${data.score}`);
      return { 
        success: false, 
        message: 'Suspicious activity detected. Please try again.' 
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    // In production, fail closed. In development, fail open for easier testing.
    return { 
      success: process.env.NODE_ENV !== 'production',
      message: 'Error verifying security token. Please try again.'
    };
  }
}

/**
 * Get reCAPTCHA site key (for client-side)
 */
export function getRecaptchaSiteKey(): string | undefined {
  return RECAPTCHA_SITE_KEY;
}

