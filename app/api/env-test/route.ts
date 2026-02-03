import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // This will only show server-side environment variables
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    // Server-side only variables
    recaptchaSecret: {
      exists: !!process.env.RECAPTCHA_SECRET_KEY,
      length: process.env.RECAPTCHA_SECRET_KEY?.length || 0,
      firstChars: process.env.RECAPTCHA_SECRET_KEY?.substring(0, 4) || 'none',
      lastChars: process.env.RECAPTCHA_SECRET_KEY?.slice(-4) || 'none'
    },
    // Public variables (available on client and server)
    recaptchaSiteKey: {
      exists: !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
      length: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.length || 0,
      firstChars: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.substring(0, 4) || 'none',
      lastChars: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.slice(-4) || 'none'
    },
    // Check if we can access the .env file
    envFile: {
      exists: process.env.RECAPTCHA_SECRET_KEY ? 'Yes' : 'No (or empty)'
    }
  });
}
