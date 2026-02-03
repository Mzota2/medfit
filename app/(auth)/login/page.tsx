/**
 * Login page with SEO metadata
 */
import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import LoginPageClient from './LoginPageClient';
import { Suspense } from 'react';

/**
 * Generate metadata for login page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'Sign In',
      `Sign in to your account at ${business?.name || 'our store'} to access your orders, bookings, and personalized shopping experience. Quick and secure login with email or Google.`,
      '/login',
      business
    );
  } catch (error) {
    console.error('Error generating login metadata:', error);
    return generatePageMetadata(
      'Sign In',
      'Sign in to your account to access your orders, bookings, and personalized shopping experience. Quick and secure login with email or Google.',
      '/login',
      null
    );
  }
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-sm text-text-secondary">Loading...</p>
        </div>
      }
    >
      <LoginPageClient />
    </Suspense>
  );
  
}
