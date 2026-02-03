/**
 * Sign up page with SEO metadata
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/metadata/utils';
import { getBusiness } from '@/lib/businesses';
import SignUpPageClient from './SignUpPageClient';

/**
 * Generate metadata for signup page (runs server-side)
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const business = await getBusiness();
    return generatePageMetadata(
      'Sign Up',
      `Create a free account at ${business?.name || 'our store'} to start shopping. Enjoy exclusive deals, track orders, book services, and access your personalized dashboard. Sign up with email or Google.`,
      '/signup',
      business
    );
  } catch (error) {
    console.error('Error generating signup metadata:', error);
    return generatePageMetadata(
      'Sign Up',
      'Create a free account to start shopping. Enjoy exclusive deals, track orders, book services, and access your personalized dashboard. Sign up with email or Google.',
      '/signup',
      null
    );
  }
}

export default function SignUpPage() {
  return <SignUpPageClient />;
}
